"""
QuantCopilot AI - Dedicated Database Schema & Initial Data Module
"""

import json
from typing import Any, Dict, List
import asyncpg

# Table Creation DDL Statements
CREATE_POSITIONS_TABLE_SQL = """
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
"""

CREATE_PORTFOLIO_SUMMARY_TABLE_SQL = """
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
"""

CREATE_GNN_NODES_TABLE_SQL = """
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
"""

CREATE_HISTORICAL_TABLE_SQL = """
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
"""

CREATE_SECURITIES_TABLE_SQL = """
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
"""

# Seed Data SQL Statements
SEED_POSITIONS_SQL = """
INSERT INTO positions (symbol, quantity, entry_price, current_price, unrealized_pnl, realized_pnl, side, leverage)
VALUES 
    ('RELIANCE', 100.0, 2880.0, 2985.40, 10540.0, 4500.0, 'LONG', 1.0),
    ('TCS', 50.0, 4120.0, 4210.80, 4540.0, 3200.0, 'LONG', 1.0),
    ('HDFCBANK', 150.0, 1550.0, 1612.30, 9345.0, 2800.0, 'LONG', 1.0),
    ('INFY', 120.0, 1780.0, 1845.60, 7872.0, 1500.0, 'LONG', 1.0),
    ('TATAMOTORS', 200.0, 990.0, 1042.15, 10430.0, 0.0, 'LONG', 1.0),
    ('SBIN', 250.0, 790.0, 824.50, 8625.0, 1200.0, 'LONG', 1.0)
ON CONFLICT (symbol) DO NOTHING;
"""

SEED_PORTFOLIO_SUMMARY_SQL = """
INSERT INTO portfolio_summary (total_equity, realized_pnl, unrealized_pnl, daily_pnl, daily_pnl_percentage, net_exposure, margin_usage, sharpe_ratio, var_99)
VALUES (1450000.00, 13200.0, 51352.0, 8450.00, 0.58, 1145000.0, 28.5, 2.85, 18200.0)
ON CONFLICT DO NOTHING;
"""

SEED_GNN_NODES_SQL = """
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
"""

SEED_SECURITIES_SQL = """
INSERT INTO securities_master (symbol, exchange, scrip_code, isin, company_name, sector, market_cap_cr)
VALUES
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
    ('TATAMOTORS', 'NSE', '500570', 'INE155A01022', 'Tata Motors Ltd', 'Automotive', 383200.0),
    ('TATAMOTORS', 'BSE', '500570', 'INE155A01022', 'Tata Motors Ltd', 'Automotive', 383200.0),
    ('SBIN', 'NSE', '500112', 'INE062A01020', 'State Bank of India', 'Banking', 735800.0),
    ('SBIN', 'BSE', '500112', 'INE062A01020', 'State Bank of India', 'Banking', 735800.0),
    ('ITC', 'NSE', '500875', 'INE154A01025', 'ITC Ltd', 'FMCG', 615400.0),
    ('ITC', 'BSE', '500875', 'INE154A01025', 'ITC Ltd', 'FMCG', 615400.0),
    ('BHARTIARTL', 'NSE', '532454', 'INE397D01024', 'Bharti Airtel Ltd', 'Telecom', 845100.0),
    ('BHARTIARTL', 'BSE', '532454', 'INE397D01024', 'Bharti Airtel Ltd', 'Telecom', 845100.0),
    ('LT', 'NSE', '500510', 'INE018A01030', 'Larsen & Toubro Ltd', 'Infrastructure', 497600.0),
    ('LT', 'BSE', '500510', 'INE018A01030', 'Larsen & Toubro Ltd', 'Infrastructure', 497600.0),
    ('AXISBANK', 'NSE', '532215', 'INE238A01034', 'Axis Bank Ltd', 'Banking', 364800.0),
    ('AXISBANK', 'BSE', '532215', 'INE238A01034', 'Axis Bank Ltd', 'Banking', 364800.0),
    ('KOTAKBANK', 'NSE', '500247', 'INE237A01028', 'Kotak Mahindra Bank Ltd', 'Banking', 355900.0),
    ('KOTAKBANK', 'BSE', '500247', 'INE237A01028', 'Kotak Mahindra Bank Ltd', 'Banking', 355900.0),
    ('HINDUNILVR', 'NSE', '500696', 'INE030A01027', 'Hindustan Unilever Ltd', 'FMCG', 621500.0),
    ('HINDUNILVR', 'BSE', '500696', 'INE030A01027', 'Hindustan Unilever Ltd', 'FMCG', 621500.0),
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
    ('NIFTY 50', 'NSE', 'INDEX', 'NIFTY50', 'NIFTY 50 Benchmark Index', 'Index', 0.0),
    ('SENSEX', 'BSE', 'INDEX', 'SENSEX', 'S&P BSE SENSEX Benchmark Index', 'Index', 0.0),
    ('BANKNIFTY', 'NSE', 'INDEX', 'BANKNIFTY', 'NIFTY Bank Sectoral Index', 'Index', 0.0)
ON CONFLICT (symbol, exchange) DO NOTHING;
"""


async def initialize_database_schema(conn: asyncpg.Connection) -> None:
    """
    Executes table creation DDLs and seeds initial quantitative data into PostgreSQL.
    """
    # Create tables
    await conn.execute(CREATE_POSITIONS_TABLE_SQL)
    await conn.execute(CREATE_PORTFOLIO_SUMMARY_TABLE_SQL)
    await conn.execute(CREATE_GNN_NODES_TABLE_SQL)
    await conn.execute(CREATE_HISTORICAL_TABLE_SQL)
    await conn.execute(CREATE_SECURITIES_TABLE_SQL)

    # Seed initial data if tables are freshly created
    await conn.execute(SEED_POSITIONS_SQL)
    await conn.execute(SEED_PORTFOLIO_SUMMARY_SQL)
    await conn.execute(SEED_GNN_NODES_SQL)
    await conn.execute(SEED_SECURITIES_SQL)


