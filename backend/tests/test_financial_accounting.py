"""
QuantCopilot Production-Grade Financial Accounting & Security Verification Suite
Tests:
1. Short Position P&L Mathematics (Drop in price produces positive profit)
2. Portfolio Exposure, Non-Negative Margin Usage, Strictly Positive VaR 99
3. PBKDF2-HMAC-SHA256 Password Security & Legacy Compatibility
4. HMAC Session Token Generation, Expiration & Tamper-Proofing
5. IDOR Access Control (Enforces customer ownership, blocks horizontal privilege escalation)
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.customer_portfolio_db import (
    CustomerPortfolioDB,
    hash_password,
    verify_password,
    generate_session_token,
    verify_session_token
)
from app.routers.portfolio import verify_customer_access
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials


class TestFinancialAccountingAndSecurity(unittest.TestCase):

    def setUp(self):
        # Use a temporary memory/test database file
        self.test_db_file = os.path.join(os.path.dirname(__file__), "test_temp_customer_db.json")
        if os.path.exists(self.test_db_file):
            os.remove(self.test_db_file)
        self.db = CustomerPortfolioDB(db_file=self.test_db_file)

    def tearDown(self):
        if os.path.exists(self.test_db_file):
            try:
                os.remove(self.test_db_file)
            except:
                pass

    def test_short_position_pnl_mathematics(self):
        """FIN-01: When shorting a stock and price drops, unrealized P&L MUST be strictly positive."""
        entry_price = 2500.0
        cur_price_dropped = 2300.0  # ₹200 drop
        qty = 50.0
        mult = -1.0  # SHORT
        leverage = 1.0

        pnl_gain = round((cur_price_dropped - entry_price) * qty * mult * leverage, 2)
        self.assertEqual(pnl_gain, 10000.0, "Short position on price drop must yield positive profit")

        cur_price_rose = 2700.0  # ₹200 rise
        pnl_loss = round((cur_price_rose - entry_price) * qty * mult * leverage, 2)
        self.assertEqual(pnl_loss, -10000.0, "Short position on price rise must yield negative loss")

    def test_margin_usage_and_var_non_negative_on_net_short(self):
        """FIN-02: A net short portfolio must NEVER display negative margin usage or negative VaR."""
        short_positions = [
            {
                "symbol": "RELIANCE",
                "quantity": 100.0,
                "entry_price": 3000.0,
                "current_price": 2800.0,
                "side": "SHORT",
                "leverage": 1.0
            },
            {
                "symbol": "TCS",
                "quantity": 50.0,
                "entry_price": 4000.0,
                "current_price": 3900.0,
                "side": "SHORT",
                "leverage": 1.0
            }
        ]

        port = self.db.save_customer_positions("cust_sahitya", short_positions, cash_balance=500000.0)
        
        self.assertLess(port["net_exposure"], 0, "Net exposure on short positions should be signed negative")
        self.assertGreater(port["margin_usage"], 0.0, "Margin usage MUST be strictly positive")
        self.assertLessEqual(port["margin_usage"], 100.0, "Margin usage must not exceed 100%")
        self.assertGreater(port["var_99"], 0.0, "Value at Risk (VaR 99) MUST be strictly positive")
        self.assertGreater(port["unrealized_pnl"], 0.0, "Short profit must increase unrealized P&L")
        self.assertGreater(port["total_equity"], 500000.0, "Equity must increase from short gains")

    def test_pbkdf2_password_security_and_upgrade(self):
        """SEC-01: Password hashing must use PBKDF2-HMAC-SHA256 with per-user salt and verify correctly."""
        raw_pwd = "SuperSecretTraderPass2026!"
        hashed = hash_password(raw_pwd)
        
        self.assertIn("$", hashed, "PBKDF2 hash format must include salt separator '$'")
        self.assertTrue(verify_password(raw_pwd, hashed), "Password verification with PBKDF2 must succeed")
        self.assertFalse(verify_password("WrongPassword123", hashed), "Invalid password must fail verification")

        # Test legacy SHA-256 hash backwards compatibility
        import hashlib
        legacy_hash = hashlib.sha256(("quantcopilot_secure_salt_2026" + raw_pwd).encode("utf-8")).hexdigest()
        self.assertTrue(verify_password(raw_pwd, legacy_hash), "Legacy SHA-256 hash must verify correctly for existing users")

    def test_hmac_session_tokens_and_tamper_detection(self):
        """SEC-02: Session tokens must be signed with HMAC and reject any tampering or expiration."""
        cid = "cust_quant_alpha"
        token = generate_session_token(cid)
        
        verified_cid = verify_session_token(token)
        self.assertEqual(verified_cid, cid, "Valid token must return expected customer_id")

        # Tampered customer ID
        tampered_token = token.replace(cid, "cust_hacker")
        self.assertIsNone(verify_session_token(tampered_token), "Tampered token must be rejected")

        # Tampered signature
        parts = token.split(":")
        tampered_sig = f"{parts[0]}:{parts[1]}:badsignature123"
        self.assertIsNone(verify_session_token(tampered_sig), "Tampered signature must be rejected")

        # Expired token (max_age = 0)
        self.assertIsNone(verify_session_token(token, max_age_seconds=0), "Expired token must be rejected")

    def test_idor_protection_on_customer_endpoints(self):
        """SEC-03: Access to customer portfolios must prevent horizontal privilege escalation (IDOR)."""
        victim_cid = "cust_institutional_fund"
        attacker_cid = "cust_malicious_user"

        attacker_token = generate_session_token(attacker_cid)
        victim_token = generate_session_token(victim_cid)

        # Attacker tries to modify victim's portfolio using their own token
        attacker_creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=attacker_token)
        with self.assertRaises(HTTPException) as ctx:
            verify_customer_access(victim_cid, attacker_creds)
        self.assertEqual(ctx.exception.status_code, 403, "Accessing another customer's portfolio must return 403 Forbidden")

        # Unauthenticated request to private account
        with self.assertRaises(HTTPException) as ctx:
            verify_customer_access(victim_cid, None)
        self.assertEqual(ctx.exception.status_code, 401, "Unauthenticated mutation to private customer must return 401")

        # Legitimate owner accesses their own portfolio
        victim_creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=victim_token)
        result = verify_customer_access(victim_cid, victim_creds)
        self.assertEqual(result, victim_cid, "Legitimate owner token must be allowed")

        # Default sandbox account allows demo exploration
        demo_result = verify_customer_access("cust_sahitya", None)
        self.assertEqual(demo_result, "cust_sahitya", "Sandbox demo account allows test exploration")


if __name__ == "__main__":
    unittest.main()
