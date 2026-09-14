-- QuantCopilot AI PostgreSQL Schema Initialization

CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) UNIQUE NOT NULL,
    quantity DOUBLE PRECISION NOT NULL,
    entry_price DOUBLE PRECISION NOT NULL,
    current_price DOUBLE PRECISION NOT NULL,
    unrealized_pnl DOUBLE PRECISION NOT NULL,
    realized_pnl DOUBLE PRECISION NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('LONG', 'SHORT')),
    leverage DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_summary (
    id SERIAL PRIMARY KEY,
    total_equity DOUBLE PRECISION NOT NULL,
    realized_pnl DOUBLE PRECISION NOT NULL,
    unrealized_pnl DOUBLE PRECISION NOT NULL,
    daily_pnl DOUBLE PRECISION NOT NULL,
    daily_pnl_percentage DOUBLE PRECISION NOT NULL,
    net_exposure DOUBLE PRECISION NOT NULL,
    margin_usage DOUBLE PRECISION NOT NULL,
    sharpe_ratio DOUBLE PRECISION NOT NULL,
    var_99 DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gnn_risk_nodes (
    id SERIAL PRIMARY KEY,
    node_id VARCHAR(50) UNIQUE NOT NULL,
    asset_name VARCHAR(50) NOT NULL,
    risk_score DOUBLE PRECISION NOT NULL,
    centrality DOUBLE PRECISION NOT NULL,
    systemic_contagion_factor DOUBLE PRECISION NOT NULL,
    features JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Master Securities Catalog for all NSE and BSE listed stocks
CREATE TABLE IF NOT EXISTS securities_master (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    exchange VARCHAR(10) NOT NULL CHECK (exchange IN ('NSE', 'BSE')),
    scrip_code VARCHAR(20),
    isin VARCHAR(20),
    company_name VARCHAR(255) NOT NULL,
    sector VARCHAR(100) DEFAULT 'Equities',
    industry VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    market_cap_cr DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_symbol_exchange UNIQUE (symbol, exchange)
);

CREATE INDEX IF NOT EXISTS idx_securities_search ON securities_master (symbol, company_name, exchange);

-- Complete Historical OHLCV Series Table (Multi-exchange ready)
CREATE TABLE IF NOT EXISTS historical_stock_data (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    exchange VARCHAR(10) NOT NULL DEFAULT 'NSE',
    date DATE NOT NULL,
    open_price DOUBLE PRECISION NOT NULL,
    high_price DOUBLE PRECISION NOT NULL,
    low_price DOUBLE PRECISION NOT NULL,
    close_price DOUBLE PRECISION NOT NULL,
    volume BIGINT NOT NULL,
    pct_change DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_symbol_exchange_date UNIQUE (symbol, exchange, date)
);

CREATE INDEX IF NOT EXISTS idx_stock_sym_exchange_date ON historical_stock_data (symbol, exchange, date DESC);

-- Initial Seed Data (Authentic Indian Equity Portfolio Positions)
INSERT INTO positions (symbol, quantity, entry_price, current_price, unrealized_pnl, realized_pnl, side, leverage)
VALUES 
    ('RELIANCE', 100.0, 2880.0, 2985.40, 10540.0, 4500.0, 'LONG', 1.0),
    ('TCS', 50.0, 4120.0, 4210.80, 4540.0, 3200.0, 'LONG', 1.0),
    ('HDFCBANK', 150.0, 1550.0, 1612.30, 9345.0, 2800.0, 'LONG', 1.0),
    ('INFY', 120.0, 1780.0, 1845.60, 7872.0, 1500.0, 'LONG', 1.0),
    ('TATAMOTORS', 200.0, 990.0, 1042.15, 10430.0, 0.0, 'LONG', 1.0),
    ('SBIN', 250.0, 790.0, 824.50, 8625.0, 1200.0, 'LONG', 1.0)
ON CONFLICT (symbol) DO NOTHING;

INSERT INTO portfolio_summary (total_equity, realized_pnl, unrealized_pnl, daily_pnl, daily_pnl_percentage, net_exposure, margin_usage, sharpe_ratio, var_99)
VALUES (1450000.00, 13200.0, 51352.0, 8450.00, 0.58, 1145000.0, 28.5, 2.85, 18200.0)
ON CONFLICT DO NOTHING;

INSERT INTO gnn_risk_nodes (node_id, asset_name, risk_score, centrality, systemic_contagion_factor, features)
VALUES 
    ('0', 'RELIANCE-EQ', 0.28, 0.92, 0.72, '[0.015, 1.25, 0.92, 0.95]'),
    ('1', 'TCS-EQ', 0.22, 0.85, 0.58, '[0.012, 1.10, 0.85, 0.88]'),
    ('2', 'HDFCBANK-EQ', 0.35, 0.94, 0.81, '[0.018, 1.42, 0.94, 0.91]'),
    ('3', 'INFY-EQ', 0.24, 0.82, 0.60, '[0.013, 1.15, 0.82, 0.85]'),
    ('4', 'ICICIBANK-EQ', 0.31, 0.89, 0.76, '[0.016, 1.35, 0.89, 0.89]'),
    ('5', 'TATAMOTORS-EQ', 0.42, 0.78, 0.68, '[0.022, 1.65, 0.78, 0.82]'),
    ('6', 'SBIN-EQ', 0.38, 0.88, 0.79, '[0.019, 1.50, 0.88, 0.86]'),
    ('7', 'ITC-EQ', 0.18, 0.71, 0.45, '[0.009, 0.88, 0.71, 0.78]'),
    ('8', 'BHARTIARTL-EQ', 0.25, 0.80, 0.55, '[0.014, 1.12, 0.80, 0.83]'),
    ('9', 'LT-EQ', 0.29, 0.83, 0.64, '[0.015, 1.28, 0.83, 0.85]')
ON CONFLICT (node_id) DO NOTHING;

-- Seed Initial Securities Master Catalogue (All Major NIFTY 50, NIFTY Next 50, BSE Equities & Benchmark Indices)
INSERT INTO securities_master (symbol, exchange, scrip_code, isin, company_name, sector, market_cap_cr)
VALUES
    -- NIFTY 50 Core Universe (NSE & BSE)
    ('RELIANCE', 'NSE', '500325', 'INE002A01018', 'Reliance Industries Ltd', 'Energy', 2018450.0),
    ('RELIANCE', 'BSE', '500325', 'INE002A01018', 'Reliance Industries Ltd', 'Energy', 2018450.0),
    ('TCS', 'NSE', '532540', 'INE467B01029', 'Tata Consultancy Services Ltd', 'IT Services', 1524100.0),
    ('TCS', 'BSE', '532540', 'INE467B01029', 'Tata Consultancy Services Ltd', 'IT Services', 1524100.0),
    ('HDFCBANK', 'NSE', '500180', 'INE040A01034', 'HDFC Bank Ltd', 'Banking', 1228900.0),
    ('HDFCBANK', 'BSE', '500180', 'INE040A01034', 'HDFC Bank Ltd', 'Banking', 1228900.0),
    ('INFY', 'NSE', '500209', 'INE009A01021', 'Infosys Ltd', 'IT Services', 765400.0),
    ('INFY', 'BSE', '500209', 'INE009A01021', 'Infosys Ltd', 'IT Services', 765400.0),
    ('ICICIBANK', 'NSE', '532174', 'INE090A01021', 'ICICI Bank Ltd', 'Banking', 827500.0),
    ('ICICIBANK', 'BSE', '532174', 'INE090A01021', 'ICICI Bank Ltd', 'Banking', 827500.0),
    ('BHARTIARTL', 'NSE', '532454', 'INE397D01024', 'Bharti Airtel Ltd', 'Telecom', 845100.0),
    ('BHARTIARTL', 'BSE', '532454', 'INE397D01024', 'Bharti Airtel Ltd', 'Telecom', 845100.0),
    ('SBIN', 'NSE', '500112', 'INE062A01020', 'State Bank of India', 'Banking', 735800.0),
    ('SBIN', 'BSE', '500112', 'INE062A01020', 'State Bank of India', 'Banking', 735800.0),
    ('ITC', 'NSE', '500875', 'INE154A01025', 'ITC Ltd', 'FMCG', 615400.0),
    ('ITC', 'BSE', '500875', 'INE154A01025', 'ITC Ltd', 'FMCG', 615400.0),
    ('LT', 'NSE', '500510', 'INE018A01030', 'Larsen & Toubro Ltd', 'Infrastructure', 497600.0),
    ('LT', 'BSE', '500510', 'INE018A01030', 'Larsen & Toubro Ltd', 'Infrastructure', 497600.0),
    ('HINDUNILVR', 'NSE', '500696', 'INE030A01027', 'Hindustan Unilever Ltd', 'FMCG', 621500.0),
    ('HINDUNILVR', 'BSE', '500696', 'INE030A01027', 'Hindustan Unilever Ltd', 'FMCG', 621500.0),
    ('AXISBANK', 'NSE', '532215', 'INE238A01034', 'Axis Bank Ltd', 'Banking', 364800.0),
    ('AXISBANK', 'BSE', '532215', 'INE238A01034', 'Axis Bank Ltd', 'Banking', 364800.0),
    ('KOTAKBANK', 'NSE', '500247', 'INE237A01028', 'Kotak Mahindra Bank Ltd', 'Banking', 355900.0),
    ('KOTAKBANK', 'BSE', '500247', 'INE237A01028', 'Kotak Mahindra Bank Ltd', 'Banking', 355900.0),
    ('TATAMOTORS', 'NSE', '500570', 'INE155A01022', 'Tata Motors Ltd', 'Automotive', 383200.0),
    ('TATAMOTORS', 'BSE', '500570', 'INE155A01022', 'Tata Motors Ltd', 'Automotive', 383200.0),
    ('MARUTI', 'NSE', '532500', 'INE585B01010', 'Maruti Suzuki India Ltd', 'Automotive', 391400.0),
    ('MARUTI', 'BSE', '532500', 'INE585B01010', 'Maruti Suzuki India Ltd', 'Automotive', 391400.0),
    ('SUNPHARMA', 'NSE', '524715', 'INE044A01036', 'Sun Pharmaceutical Industries Ltd', 'Pharma', 410500.0),
    ('SUNPHARMA', 'BSE', '524715', 'INE044A01036', 'Sun Pharmaceutical Industries Ltd', 'Pharma', 410500.0),
    ('BAJFINANCE', 'NSE', '500034', 'INE296A01024', 'Bajaj Finance Ltd', 'Financial Services', 426100.0),
    ('BAJFINANCE', 'BSE', '500034', 'INE296A01024', 'Bajaj Finance Ltd', 'Financial Services', 426100.0),
    ('TATASTEEL', 'NSE', '500470', 'INE081A01020', 'Tata Steel Ltd', 'Metals', 197800.0),
    ('TATASTEEL', 'BSE', '500470', 'INE081A01020', 'Tata Steel Ltd', 'Metals', 197800.0),
    ('ASIANPAINT', 'NSE', '500820', 'INE021A01026', 'Asian Paints Ltd', 'Paints & Coatings', 285400.0),
    ('ASIANPAINT', 'BSE', '500820', 'INE021A01026', 'Asian Paints Ltd', 'Paints & Coatings', 285400.0),
    ('TITAN', 'NSE', '500114', 'INE280A01028', 'Titan Company Ltd', 'Consumer Discretionary', 312500.0),
    ('TITAN', 'BSE', '500114', 'INE280A01028', 'Titan Company Ltd', 'Consumer Discretionary', 312500.0),
    ('WIPRO', 'NSE', '507685', 'INE075A01022', 'Wipro Ltd', 'IT Services', 278900.0),
    ('WIPRO', 'BSE', '507685', 'INE075A01022', 'Wipro Ltd', 'IT Services', 278900.0),
    ('HCLTECH', 'NSE', '532281', 'INE860A01027', 'HCL Technologies Ltd', 'IT Services', 492300.0),
    ('HCLTECH', 'BSE', '532281', 'INE860A01027', 'HCL Technologies Ltd', 'IT Services', 492300.0),
    ('BAJAJFINSV', 'NSE', '532978', 'INE918I01026', 'Bajaj Finserv Ltd', 'Financial Services', 298400.0),
    ('BAJAJFINSV', 'BSE', '532978', 'INE918I01026', 'Bajaj Finserv Ltd', 'Financial Services', 298400.0),
    ('NTPC', 'NSE', '532555', 'INE733E01010', 'NTPC Ltd', 'Power & Utilities', 389400.0),
    ('NTPC', 'BSE', '532555', 'INE733E01010', 'NTPC Ltd', 'Power & Utilities', 389400.0),
    ('ONGC', 'NSE', '500312', 'INE213A01029', 'Oil & Natural Gas Corporation Ltd', 'Energy', 378200.0),
    ('ONGC', 'BSE', '500312', 'INE213A01029', 'Oil & Natural Gas Corporation Ltd', 'Energy', 378200.0),
    ('POWERGRID', 'NSE', '532898', 'INE752E01010', 'Power Grid Corporation of India Ltd', 'Power & Utilities', 315600.0),
    ('POWERGRID', 'BSE', '532898', 'INE752E01010', 'Power Grid Corporation of India Ltd', 'Power & Utilities', 315600.0),
    ('COALINDIA', 'NSE', '533278', 'INE522F01014', 'Coal India Ltd', 'Mining & Energy', 312800.0),
    ('COALINDIA', 'BSE', '533278', 'INE522F01014', 'Coal India Ltd', 'Mining & Energy', 312800.0),
    ('ADANIENT', 'NSE', '512599', 'INE423A01024', 'Adani Enterprises Ltd', 'Conglomerate', 345600.0),
    ('ADANIENT', 'BSE', '512599', 'INE423A01024', 'Adani Enterprises Ltd', 'Conglomerate', 345600.0),
    ('ADANIPORTS', 'NSE', '532921', 'INE742F01042', 'Adani Ports and Special Economic Zone Ltd', 'Logistics & Ports', 318900.0),
    ('ADANIPORTS', 'BSE', '532921', 'INE742F01042', 'Adani Ports and Special Economic Zone Ltd', 'Logistics & Ports', 318900.0),
    ('M&M', 'NSE', '500520', 'INE101A01026', 'Mahindra & Mahindra Ltd', 'Automotive', 342100.0),
    ('M&M', 'BSE', '500520', 'INE101A01026', 'Mahindra & Mahindra Ltd', 'Automotive', 342100.0),
    ('NESTLEIND', 'NSE', '500790', 'INE239A01024', 'Nestle India Ltd', 'FMCG', 248900.0),
    ('NESTLEIND', 'BSE', '500790', 'INE239A01024', 'Nestle India Ltd', 'FMCG', 248900.0),
    ('ULTRACEMCO', 'NSE', '532538', 'INE481G01011', 'UltraTech Cement Ltd', 'Cement', 324500.0),
    ('ULTRACEMCO', 'BSE', '532538', 'INE481G01011', 'UltraTech Cement Ltd', 'Cement', 324500.0),
    ('JSWSTEEL', 'NSE', '500228', 'INE019A01038', 'JSW Steel Ltd', 'Metals', 234100.0),
    ('JSWSTEEL', 'BSE', '500228', 'INE019A01038', 'JSW Steel Ltd', 'Metals', 234100.0),
    ('GRASIM', 'NSE', '500300', 'INE047A01021', 'Grasim Industries Ltd', 'Chemicals & Materials', 178200.0),
    ('GRASIM', 'BSE', '500300', 'INE047A01021', 'Grasim Industries Ltd', 'Chemicals & Materials', 178200.0),
    ('TECHM', 'NSE', '532755', 'INE669C01036', 'Tech Mahindra Ltd', 'IT Services', 154300.0),
    ('TECHM', 'BSE', '532755', 'INE669C01036', 'Tech Mahindra Ltd', 'IT Services', 154300.0),
    ('INDUSINDBK', 'NSE', '532187', 'INE095A01012', 'IndusInd Bank Ltd', 'Banking', 112400.0),
    ('INDUSINDBK', 'BSE', '532187', 'INE095A01012', 'IndusInd Bank Ltd', 'Banking', 112400.0),
    ('CIPLA', 'NSE', '500087', 'INE059A01026', 'Cipla Ltd', 'Pharma', 128900.0),
    ('CIPLA', 'BSE', '500087', 'INE059A01026', 'Cipla Ltd', 'Pharma', 128900.0),
    ('DRREDDY', 'NSE', '500124', 'INE089A01023', 'Dr. Reddy Laboratories Ltd', 'Pharma', 112100.0),
    ('DRREDDY', 'BSE', '500124', 'INE089A01023', 'Dr. Reddy Laboratories Ltd', 'Pharma', 112100.0),
    ('APOLLOHOSP', 'NSE', '508869', 'INE437A01024', 'Apollo Hospitals Enterprise Ltd', 'Healthcare', 98400.0),
    ('APOLLOHOSP', 'BSE', '508869', 'INE437A01024', 'Apollo Hospitals Enterprise Ltd', 'Healthcare', 98400.0),
    ('DIVISLAB', 'NSE', '532488', 'INE361B01024', 'Divi Laboratories Ltd', 'Pharma', 134200.0),
    ('DIVISLAB', 'BSE', '532488', 'INE361B01024', 'Divi Laboratories Ltd', 'Pharma', 134200.0),
    ('BRITANNIA', 'NSE', '500825', 'INE216A01030', 'Britannia Industries Ltd', 'FMCG', 138900.0),
    ('BRITANNIA', 'BSE', '500825', 'INE216A01030', 'Britannia Industries Ltd', 'FMCG', 138900.0),
    ('EICHERMOT', 'NSE', '505200', 'INE066A01021', 'Eicher Motors Ltd', 'Automotive', 132400.0),
    ('EICHERMOT', 'BSE', '505200', 'INE066A01021', 'Eicher Motors Ltd', 'Automotive', 132400.0),
    ('TATACONSUM', 'NSE', '500800', 'INE192A01025', 'Tata Consumer Products Ltd', 'FMCG', 114500.0),
    ('TATACONSUM', 'BSE', '500800', 'INE192A01025', 'Tata Consumer Products Ltd', 'FMCG', 114500.0),
    ('SBILIFE', 'NSE', '540719', 'INE123W01016', 'SBI Life Insurance Company Ltd', 'Insurance', 178900.0),
    ('SBILIFE', 'BSE', '540719', 'INE123W01016', 'SBI Life Insurance Company Ltd', 'Insurance', 178900.0),
    ('HDFCLIFE', 'NSE', '540777', 'INE795G01014', 'HDFC Life Insurance Company Ltd', 'Insurance', 154200.0),
    ('HDFCLIFE', 'BSE', '540777', 'INE795G01014', 'HDFC Life Insurance Company Ltd', 'Insurance', 154200.0),
    ('BPCL', 'NSE', '500547', 'INE029A01011', 'Bharat Petroleum Corporation Ltd', 'Energy', 148900.0),
    ('BPCL', 'BSE', '500547', 'INE029A01011', 'Bharat Petroleum Corporation Ltd', 'Energy', 148900.0),
    ('HEROMOTOCO', 'NSE', '500182', 'INE158A01026', 'Hero MotoCorp Ltd', 'Automotive', 112500.0),
    ('HEROMOTOCO', 'BSE', '500182', 'INE158A01026', 'Hero MotoCorp Ltd', 'Automotive', 112500.0),
    ('HINDALCO', 'NSE', '500440', 'INE038A01020', 'Hindalco Industries Ltd', 'Metals', 156400.0),
    ('HINDALCO', 'BSE', '500440', 'INE038A01020', 'Hindalco Industries Ltd', 'Metals', 156400.0),
    ('SHREECEM', 'NSE', '500387', 'INE070A01015', 'Shree Cement Ltd', 'Cement', 98700.0),
    ('SHREECEM', 'BSE', '500387', 'INE070A01015', 'Shree Cement Ltd', 'Cement', 98700.0),
    ('LTIM', 'NSE', '540005', 'INE214T01019', 'LTIMindtree Ltd', 'IT Services', 178200.0),
    ('LTIM', 'BSE', '540005', 'INE214T01019', 'LTIMindtree Ltd', 'IT Services', 178200.0),
    ('BAJAJ-AUTO', 'NSE', '532977', 'INE917I01010', 'Bajaj Auto Ltd', 'Automotive', 289400.0),
    ('BAJAJ-AUTO', 'BSE', '532977', 'INE917I01010', 'Bajaj Auto Ltd', 'Automotive', 289400.0),

    -- High-Growth Emerging Giants, PSUs & Midcaps
    ('ZOMATO', 'NSE', '543320', 'INE758T01015', 'Zomato Ltd', 'Internet & Services', 234100.0),
    ('ZOMATO', 'BSE', '543320', 'INE758T01015', 'Zomato Ltd', 'Internet & Services', 234100.0),
    ('JIOFIN', 'NSE', '543940', 'INE758E01017', 'Jio Financial Services Ltd', 'Financial Services', 214500.0),
    ('JIOFIN', 'BSE', '543940', 'INE758E01017', 'Jio Financial Services Ltd', 'Financial Services', 214500.0),
    ('BEL', 'NSE', '500049', 'INE263A01024', 'Bharat Electronics Ltd', 'Defence & Aerospace', 218900.0),
    ('BEL', 'BSE', '500049', 'INE263A01024', 'Bharat Electronics Ltd', 'Defence & Aerospace', 218900.0),
    ('HAL', 'NSE', '541154', 'INE066F01020', 'Hindustan Aeronautics Ltd', 'Defence & Aerospace', 324100.0),
    ('HAL', 'BSE', '541154', 'INE066F01020', 'Hindustan Aeronautics Ltd', 'Defence & Aerospace', 324100.0),
    ('TRENT', 'NSE', '500251', 'INE849A01020', 'Trent Ltd', 'Retail & Apparel', 256800.0),
    ('TRENT', 'BSE', '500251', 'INE849A01020', 'Trent Ltd', 'Retail & Apparel', 256800.0),
    ('VEDL', 'NSE', '500295', 'INE205A01025', 'Vedanta Ltd', 'Metals & Mining', 178400.0),
    ('VEDL', 'BSE', '500295', 'INE205A01025', 'Vedanta Ltd', 'Metals & Mining', 178400.0),
    ('DLF', 'NSE', '532868', 'INE271C01023', 'DLF Ltd', 'Real Estate', 212400.0),
    ('DLF', 'BSE', '532868', 'INE271C01023', 'DLF Ltd', 'Real Estate', 212400.0),
    ('IRCTC', 'NSE', '542830', 'INE335Y01020', 'Indian Railway Catering and Tourism Corp Ltd', 'Services', 76500.0),
    ('IRCTC', 'BSE', '542830', 'INE335Y01020', 'Indian Railway Catering and Tourism Corp Ltd', 'Services', 76500.0),
    ('TATAPOWER', 'NSE', '500400', 'INE245A01021', 'Tata Power Company Ltd', 'Power & Utilities', 138900.0),
    ('TATAPOWER', 'BSE', '500400', 'INE245A01021', 'Tata Power Company Ltd', 'Power & Utilities', 138900.0),
    ('INDIGO', 'NSE', '539448', 'INE646L01027', 'InterGlobe Aviation Ltd', 'Aviation', 189400.0),
    ('INDIGO', 'BSE', '539448', 'INE646L01027', 'InterGlobe Aviation Ltd', 'Aviation', 189400.0),
    ('POLYCAB', 'NSE', '542652', 'INE455K01017', 'Polycab India Ltd', 'Electrical Equipment', 104500.0),
    ('POLYCAB', 'BSE', '542652', 'INE455K01017', 'Polycab India Ltd', 'Electrical Equipment', 104500.0),
    ('PIDILITIND', 'NSE', '500331', 'INE318A01026', 'Pidilite Industries Ltd', 'Chemicals', 158900.0),
    ('PIDILITIND', 'BSE', '500331', 'INE318A01026', 'Pidilite Industries Ltd', 'Chemicals', 158900.0),
    ('SIEMENS', 'NSE', '500550', 'INE003A01024', 'Siemens Ltd', 'Capital Goods', 245800.0),
    ('SIEMENS', 'BSE', '500550', 'INE003A01024', 'Siemens Ltd', 'Capital Goods', 245800.0),
    ('DMART', 'NSE', '540376', 'INE192R01011', 'Avenue Supermarts Ltd', 'Retail', 312400.0),
    ('DMART', 'BSE', '540376', 'INE192R01011', 'Avenue Supermarts Ltd', 'Retail', 312400.0),
    ('BANKBARODA', 'NSE', '532134', 'INE028A01039', 'Bank of Baroda', 'Banking', 128900.0),
    ('BANKBARODA', 'BSE', '532134', 'INE028A01039', 'Bank of Baroda', 'Banking', 128900.0),
    ('PNB', 'NSE', '532461', 'INE160A01022', 'Punjab National Bank', 'Banking', 114500.0),
    ('PNB', 'BSE', '532461', 'INE160A01022', 'Punjab National Bank', 'Banking', 114500.0),
    ('CANBK', 'NSE', '532486', 'INE476A01022', 'Canara Bank', 'Banking', 98500.0),
    ('CANBK', 'BSE', '532486', 'INE476A01022', 'Canara Bank', 'Banking', 98500.0),

    -- Benchmark Indices
    ('NIFTY 50', 'NSE', 'INDEX', 'NIFTY50', 'NIFTY 50 Benchmark Index', 'Index', 0.0),
    ('BANKNIFTY', 'NSE', 'INDEX', 'BANKNIFTY', 'NIFTY Bank Sectoral Index', 'Index', 0.0),
    ('FINNIFTY', 'NSE', 'INDEX', 'FINNIFTY', 'NIFTY Financial Services Index', 'Index', 0.0),
    ('MIDCPNIFTY', 'NSE', 'INDEX', 'MIDCPNIFTY', 'NIFTY Midcap Select Index', 'Index', 0.0),
    ('SENSEX', 'BSE', 'INDEX', 'SENSEX', 'S&P BSE SENSEX Benchmark Index', 'Index', 0.0)
ON CONFLICT (symbol, exchange) DO UPDATE
SET company_name = EXCLUDED.company_name,
    sector = EXCLUDED.sector,
    scrip_code = EXCLUDED.scrip_code,
    isin = EXCLUDED.isin,
    market_cap_cr = EXCLUDED.market_cap_cr;


