"""
QuantCopilot AI - Custom Autonomous Customer Portfolio Database Engine
Self-contained, transactional, file-backed atomic document store.
Stores customer profiles, account credentials, and portfolio positions persistently
without requiring external SQLite or broken PostgreSQL connections.
"""

import os
import json
import logging
import hashlib
import hmac
import threading
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("customer_portfolio_db")

SALT = "quantcopilot_secure_salt_2026"
SECRET_KEY = os.environ.get("QUANTCOPILOT_SECRET_KEY", "quantcopilot_super_secret_session_key_2026")


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Computes PBKDF2-HMAC-SHA256 hash (100,000 iterations) with per-user salt."""
    if not salt:
        salt = hashlib.sha256(os.urandom(16)).hexdigest()[:16]
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verifies password against stored PBKDF2-HMAC-SHA256 or legacy SHA-256 hash."""
    if not stored_hash:
        return False
    if "$" in stored_hash:
        try:
            salt, key_hex = stored_hash.split("$", 1)
            key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
            return hmac.compare_digest(key.hex(), key_hex)
        except Exception:
            return False
    else:
        # Legacy fallback for backward compatibility
        legacy = hashlib.sha256((SALT + password).encode("utf-8")).hexdigest()
        return hmac.compare_digest(legacy, stored_hash)


def generate_session_token(customer_id: str) -> str:
    """Generates a tamper-proof HMAC-SHA256 signed session token."""
    timestamp = str(int(datetime.now(timezone.utc).timestamp()))
    payload = f"{customer_id}:{timestamp}"
    signature = hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}:{signature}"


def verify_session_token(token: str, max_age_seconds: int = 7 * 86400) -> Optional[str]:
    """Verifies signed token and returns customer_id if valid."""
    if not token or ":" not in token:
        return None
    parts = token.split(":")
    if len(parts) != 3:
        return None
    cid, ts_str, sig = parts
    payload = f"{cid}:{ts_str}"
    expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_sig, sig):
        return None
    try:
        ts = int(ts_str)
        now = int(datetime.now(timezone.utc).timestamp())
        if max_age_seconds <= 0 or (now - ts) > max_age_seconds:
            return None
    except ValueError:
        return None
    return cid


class CustomerPortfolioDB:
    """
    Thread-safe, atomic document database storing customer portfolios and credentials.
    Provides sub-millisecond in-memory reads backed by atomic JSON disk commits.
    """

    def __init__(self, db_file: Optional[str] = None):
        if db_file is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.db_dir = os.path.join(base_dir, "data")
            self.db_file = os.path.join(self.db_dir, "customer_portfolios_db.json")
        else:
            self.db_file = os.path.abspath(db_file)
            self.db_dir = os.path.dirname(self.db_file)

        self._lock = threading.RLock()
        self._data: Dict[str, Any] = {
            "schema_version": "2.0.0",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_checkpoint": datetime.now(timezone.utc).isoformat(),
            "customers": {}
        }

        os.makedirs(self.db_dir, exist_ok=True)
        self._load_or_initialize()

    def _load_or_initialize(self) -> None:
        """Loads database from disk or initializes default accounts."""
        with self._lock:
            if os.path.exists(self.db_file):
                try:
                    with open(self.db_file, "r", encoding="utf-8") as f:
                        loaded = json.load(f)
                        if isinstance(loaded, dict) and "customers" in loaded:
                            self._data = loaded
                            logger.info(f"Loaded CustomerPortfolioDB with {len(self._data['customers'])} customers.")
                            return
                except Exception as e:
                    logger.error(f"Error loading {self.db_file}: {e}. Reinitializing with defaults.")

            self._seed_default_customers()
            self._persist_to_disk()

    def _seed_default_customers(self) -> None:
        """Seeds standard starter accounts so users can immediately test & trade."""
        now = datetime.now(timezone.utc).isoformat()
        self._data["customers"] = {
            "cust_sahitya": {
                "customer_id": "cust_sahitya",
                "name": "Sahitya Sharma",
                "email": "sahitya@quantcopilot.ai",
                "password_hash": hash_password("quant123"),
                "account_tier": "PRO_QUANT",
                "cash_balance": 500000.0,
                "created_at": now,
                "last_login": now,
                "portfolio": {
                    "positions": [
                        {
                            "symbol": "RELIANCE",
                            "quantity": 40.0,
                            "entry_price": 1150.0,
                            "current_price": 1178.0,
                            "unrealized_pnl": 1120.0,
                            "realized_pnl": 0.0,
                            "side": "LONG",
                            "leverage": 1.0
                        },
                        {
                            "symbol": "TCS",
                            "quantity": 20.0,
                            "entry_price": 2040.0,
                            "current_price": 2076.0,
                            "unrealized_pnl": 720.0,
                            "realized_pnl": 0.0,
                            "side": "LONG",
                            "leverage": 1.0
                        },
                        {
                            "symbol": "HDFCBANK",
                            "quantity": 60.0,
                            "entry_price": 680.0,
                            "current_price": 692.25,
                            "unrealized_pnl": 735.0,
                            "realized_pnl": 0.0,
                            "side": "LONG",
                            "leverage": 1.0
                        },
                        {
                            "symbol": "INFY",
                            "quantity": 50.0,
                            "entry_price": 980.0,
                            "current_price": 997.0,
                            "unrealized_pnl": 850.0,
                            "realized_pnl": 0.0,
                            "side": "LONG",
                            "leverage": 1.0
                        },
                        {
                            "symbol": "TATAMOTORS",
                            "quantity": 50.0,
                            "entry_price": 265.0,
                            "current_price": 273.0,
                            "unrealized_pnl": 400.0,
                            "realized_pnl": 0.0,
                            "side": "LONG",
                            "leverage": 1.0
                        }
                    ],
                    "total_equity": 506457.5,
                    "realized_pnl": 0.0,
                    "unrealized_pnl": 6457.5,
                    "daily_pnl": 3200.0,
                    "daily_pnl_percentage": 0.63,
                    "net_exposure": 441000.0,
                    "margin_usage": 22.0,
                    "sharpe_ratio": 2.85,
                    "var_99": 12350.0,
                    "updated_at": now
                }
            },
            "cust_demo": {
                "customer_id": "cust_demo",
                "name": "Demo Investor",
                "email": "demo@quantcopilot.ai",
                "password_hash": hash_password("quant123"),
                "account_tier": "RETAIL_TRADER",
                "cash_balance": 250000.0,
                "created_at": now,
                "last_login": now,
                "portfolio": {
                    "positions": [
                        {
                            "symbol": "SBIN",
                            "quantity": 100.0,
                            "entry_price": 815.0,
                            "current_price": 824.5,
                            "unrealized_pnl": 950.0,
                            "realized_pnl": 0.0,
                            "side": "LONG",
                            "leverage": 1.0
                        },
                        {
                            "symbol": "ICICIBANK",
                            "quantity": 50.0,
                            "entry_price": 1160.0,
                            "current_price": 1178.9,
                            "unrealized_pnl": 945.0,
                            "realized_pnl": 0.0,
                            "side": "LONG",
                            "leverage": 1.0
                        }
                    ],
                    "total_equity": 251895.0,
                    "realized_pnl": 0.0,
                    "unrealized_pnl": 1895.0,
                    "daily_pnl": 1280.0,
                    "daily_pnl_percentage": 0.51,
                    "net_exposure": 141395.0,
                    "margin_usage": 14.1,
                    "sharpe_ratio": 2.10,
                    "var_99": 3950.0,
                    "updated_at": now
                }
            },
            "cust_fund": {
                "customer_id": "cust_fund",
                "name": "Alpha Horizon Institutional",
                "email": "fund@quantcopilot.ai",
                "password_hash": hash_password("quant123"),
                "account_tier": "INSTITUTIONAL_ALPHA",
                "cash_balance": 2000000.0,
                "created_at": now,
                "last_login": now,
                "portfolio": {
                    "positions": [
                        {
                            "symbol": "RELIANCE",
                            "quantity": 150.0,
                            "entry_price": 2940.0,
                            "current_price": 2985.4,
                            "unrealized_pnl": 6810.0,
                            "realized_pnl": 0.0,
                            "side": "LONG",
                            "leverage": 1.0
                        },
                        {
                            "symbol": "TCS",
                            "quantity": 100.0,
                            "entry_price": 4195.0,
                            "current_price": 4210.8,
                            "unrealized_pnl": 1580.0,
                            "realized_pnl": 0.0,
                            "side": "LONG",
                            "leverage": 1.0
                        },
                        {
                            "symbol": "LT",
                            "quantity": 80.0,
                            "entry_price": 3620.0,
                            "current_price": 3655.0,
                            "unrealized_pnl": 2800.0,
                            "realized_pnl": 0.0,
                            "side": "LONG",
                            "leverage": 1.0
                        }
                    ],
                    "total_equity": 2011190.0,
                    "realized_pnl": 0.0,
                    "unrealized_pnl": 11190.0,
                    "daily_pnl": 8450.0,
                    "daily_pnl_percentage": 0.42,
                    "net_exposure": 1161290.0,
                    "margin_usage": 14.5,
                    "sharpe_ratio": 3.15,
                    "var_99": 32500.0,
                    "updated_at": now
                }
            }
        }

    def _persist_to_disk(self) -> None:
        """Atomically persists internal data structure to disk."""
        with self._lock:
            self._data["last_checkpoint"] = datetime.now(timezone.utc).isoformat()
            tmp_path = f"{self.db_file}.tmp"
            try:
                with open(tmp_path, "w", encoding="utf-8") as f:
                    json.dump(self._data, f, indent=2)
                    f.flush()
                    os.fsync(f.fileno())
                os.replace(tmp_path, self.db_file)
            except Exception as e:
                logger.error(f"Failed atomic persistence to {self.db_file}: {e}")
                if os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except:
                        pass

    def register_customer(
        self,
        name: str,
        email: str,
        password: str,
        initial_cash: float = 500000.0,
        tier: str = "PRO_QUANT"
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Registers a new customer profile with persistent portfolio."""
        with self._lock:
            clean_email = email.strip().lower()
            clean_name = name.strip()

            # Check duplicate email
            for c in self._data["customers"].values():
                if c.get("email", "").lower() == clean_email:
                    return False, f"Customer with email '{clean_email}' already exists", None

            # Generate unique ID
            cid = f"cust_{clean_name.lower().replace(' ', '_')[:12]}_{hashlib.md5(clean_email.encode()).hexdigest()[:4]}"
            now = datetime.now(timezone.utc).isoformat()

            new_customer = {
                "customer_id": cid,
                "name": clean_name,
                "email": clean_email,
                "password_hash": hash_password(password),
                "account_tier": tier,
                "cash_balance": float(initial_cash),
                "created_at": now,
                "last_login": now,
                "portfolio": {
                    "positions": [],
                    "total_equity": float(initial_cash),
                    "realized_pnl": 0.0,
                    "unrealized_pnl": 0.0,
                    "daily_pnl": 0.0,
                    "daily_pnl_percentage": 0.0,
                    "net_exposure": 0.0,
                    "margin_usage": 0.0,
                    "sharpe_ratio": 2.50,
                    "var_99": 0.0,
                    "updated_at": now
                }
            }

            self._data["customers"][cid] = new_customer
            self._persist_to_disk()
            logger.info(f"Registered new customer: {clean_name} ({cid})")
            sanitized = self._sanitize_customer(new_customer)
            sanitized["auth_token"] = generate_session_token(cid)
            return True, "Registration successful", sanitized

    def authenticate(self, identifier: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticates customer by email or customer_id, updating last_login timestamp."""
        with self._lock:
            clean_id = identifier.strip().lower()

            target: Optional[Dict[str, Any]] = None
            for cid, c in self._data["customers"].items():
                if cid.lower() == clean_id or c.get("email", "").lower() == clean_id:
                    target = c
                    break

            if target and verify_password(password, target.get("password_hash", "")):
                # Upgrade legacy SHA-256 hash to PBKDF2
                if "$" not in target.get("password_hash", ""):
                    target["password_hash"] = hash_password(password)
                target["last_login"] = datetime.now(timezone.utc).isoformat()
                self._persist_to_disk()
                sanitized = self._sanitize_customer(target)
                sanitized["auth_token"] = generate_session_token(target["customer_id"])
                return sanitized

            return None

    def get_customer(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves sanitized customer record."""
        with self._lock:
            clean_id = customer_id.strip()
            # Match by ID or Email
            for cid, c in self._data["customers"].items():
                if cid.lower() == clean_id.lower() or c.get("email", "").lower() == clean_id.lower():
                    return self._sanitize_customer(c)
            return None

    def list_customer_profiles(self) -> List[Dict[str, Any]]:
        """Lists available starter demo customer profiles for fast switching."""
        with self._lock:
            results = []
            for c in self._data["customers"].values():
                cid = c.get("customer_id", "")
                if cid in ("cust_sahitya", "cust_demo", "cust_fund"):
                    results.append(self._sanitize_customer(c))
            return results

    def get_customer_portfolio(self, customer_id: str) -> Dict[str, Any]:
        """Gets portfolio for customer, falling back to default customer if not found."""
        with self._lock:
            target = self._find_customer_raw(customer_id)
            if not target:
                # Default fallback to first customer
                first_key = next(iter(self._data["customers"]), "cust_sahitya")
                target = self._data["customers"].get(first_key, {})

            portfolio = target.get("portfolio", {})
            return {
                "customer_id": target.get("customer_id", "cust_sahitya"),
                "customer_name": target.get("name", "Sahitya Sharma"),
                "cash_balance": target.get("cash_balance", 500000.0),
                "total_equity": portfolio.get("total_equity", 500000.0),
                "realized_pnl": portfolio.get("realized_pnl", 0.0),
                "unrealized_pnl": portfolio.get("unrealized_pnl", 0.0),
                "daily_pnl": portfolio.get("daily_pnl", 0.0),
                "daily_pnl_percentage": portfolio.get("daily_pnl_percentage", 0.0),
                "net_exposure": portfolio.get("net_exposure", 0.0),
                "margin_usage": portfolio.get("margin_usage", 0.0),
                "sharpe_ratio": portfolio.get("sharpe_ratio", 2.85),
                "var_99": portfolio.get("var_99", 0.0),
                "positions": portfolio.get("positions", []),
                "updated_at": portfolio.get("updated_at", datetime.now(timezone.utc).isoformat())
            }

    def save_customer_positions(
        self,
        customer_id: str,
        positions: List[Dict[str, Any]],
        cash_balance: Optional[float] = None
    ) -> Dict[str, Any]:
        """Saves updated positions list for customer and recalculates equity."""
        with self._lock:
            target = self._find_customer_raw(customer_id)
            if not target:
                # If customer doesn't exist, use default
                first_key = next(iter(self._data["customers"]), "cust_sahitya")
                target = self._data["customers"][first_key]

            if cash_balance is not None and cash_balance > 0:
                target["cash_balance"] = float(cash_balance)

            cash = float(target.get("cash_balance", 500000.0))
            now = datetime.now(timezone.utc).isoformat()

            cleaned_positions = []
            total_current_value = 0.0
            gross_exposure = 0.0
            total_unrealized = 0.0

            for p in positions:
                sym = p.get("symbol", "").strip().upper().replace("-EQ", "")
                qty = float(p.get("quantity", 0))
                entry_p = float(p.get("entry_price", 0))
                cur_p = float(p.get("current_price", entry_p) or entry_p)
                side = p.get("side", "LONG").upper()
                mult = 1.0 if side == "LONG" else -1.0
                lev = float(p.get("leverage", 1.0) or 1.0)

                unrealized = round((cur_p - entry_p) * qty * mult * lev, 2)
                realized = float(p.get("realized_pnl", 0.0) or 0.0)

                pos_entry = {
                    "symbol": sym,
                    "quantity": qty,
                    "entry_price": entry_p,
                    "current_price": cur_p,
                    "unrealized_pnl": unrealized,
                    "realized_pnl": realized,
                    "side": side,
                    "leverage": lev
                }
                cleaned_positions.append(pos_entry)

                total_current_value += (cur_p * qty * mult * lev)
                gross_exposure += (cur_p * qty * lev)
                total_unrealized += unrealized

            total_equity = round(cash + total_unrealized, 2)
            margin_usage = min(100.0, max(0.0, round((gross_exposure / max(1.0, total_equity * 4.0)) * 100.0, 2))) if total_equity > 0 else 0.0

            target["portfolio"] = {
                "positions": cleaned_positions,
                "total_equity": total_equity,
                "realized_pnl": target.get("portfolio", {}).get("realized_pnl", 0.0),
                "unrealized_pnl": round(total_unrealized, 2),
                "daily_pnl": round(total_unrealized, 2),
                "daily_pnl_percentage": round((total_unrealized / max(1.0, total_equity)) * 100.0, 2) if total_equity > 0 else 0.0,
                "net_exposure": round(total_current_value, 2),
                "margin_usage": margin_usage,
                "sharpe_ratio": target.get("portfolio", {}).get("sharpe_ratio", 2.85),
                "var_99": round(gross_exposure * 0.028, 2),
                "updated_at": now
            }

            self._persist_to_disk()
            return target["portfolio"]

    def add_or_update_position(self, customer_id: str, position: Dict[str, Any]) -> Dict[str, Any]:
        """Adds or updates a single position in customer's portfolio."""
        with self._lock:
            target = self._find_customer_raw(customer_id)
            if not target:
                first_key = next(iter(self._data["customers"]), "cust_sahitya")
                target = self._data["customers"][first_key]

            positions = target.get("portfolio", {}).get("positions", [])
            sym = position.get("symbol", "").strip().upper().replace("-EQ", "")

            found = False
            for i, p in enumerate(positions):
                if p.get("symbol", "").upper() == sym:
                    positions[i] = {
                        "symbol": sym,
                        "quantity": float(position.get("quantity", p.get("quantity", 0))),
                        "entry_price": float(position.get("entry_price", p.get("entry_price", 0))),
                        "current_price": float(position.get("current_price", p.get("current_price", 0))),
                        "unrealized_pnl": float(position.get("unrealized_pnl", 0.0)),
                        "realized_pnl": float(position.get("realized_pnl", 0.0)),
                        "side": position.get("side", p.get("side", "LONG")),
                        "leverage": float(position.get("leverage", p.get("leverage", 1.0)))
                    }
                    found = True
                    break

            if not found:
                cur_p = float(position.get("current_price", position.get("entry_price", 0)))
                positions.append({
                    "symbol": sym,
                    "quantity": float(position.get("quantity", 1)),
                    "entry_price": float(position.get("entry_price", cur_p)),
                    "current_price": cur_p,
                    "unrealized_pnl": 0.0,
                    "realized_pnl": 0.0,
                    "side": position.get("side", "LONG"),
                    "leverage": float(position.get("leverage", 1.0))
                })

            return self.save_customer_positions(target["customer_id"], positions)

    def delete_position(self, customer_id: str, symbol: str) -> Dict[str, Any]:
        """Deletes a symbol position from customer's portfolio."""
        with self._lock:
            target = self._find_customer_raw(customer_id)
            if not target:
                first_key = next(iter(self._data["customers"]), "cust_sahitya")
                target = self._data["customers"][first_key]

            positions = target.get("portfolio", {}).get("positions", [])
            clean_sym = symbol.strip().upper().replace("-EQ", "")
            updated_positions = [p for p in positions if p.get("symbol", "").upper() != clean_sym]
            return self.save_customer_positions(target["customer_id"], updated_positions)

    def clear_portfolio(self, customer_id: str) -> Dict[str, Any]:
        """Clears all positions for customer."""
        with self._lock:
            target = self._find_customer_raw(customer_id)
            if not target:
                first_key = next(iter(self._data["customers"]), "cust_sahitya")
                target = self._data["customers"][first_key]

            return self.save_customer_positions(target["customer_id"], [])

    def update_live_metrics(
        self,
        customer_id: str,
        updated_positions: List[Dict[str, Any]],
        total_unrealized: float,
        daily_pnl: float,
        net_exposure: float,
        gross_exposure: Optional[float] = None
    ) -> None:
        """Updates live Yahoo Finance market valuations in customer's stored portfolio."""
        with self._lock:
            target = self._find_customer_raw(customer_id)
            if not target:
                return

            cash = float(target.get("cash_balance", 500000.0))
            total_equity = round(cash + total_unrealized, 2)
            gross = gross_exposure if gross_exposure is not None else abs(net_exposure)
            margin_usage = min(100.0, max(0.0, round((gross / max(1.0, total_equity * 4.0)) * 100.0, 2))) if total_equity > 0 else 0.0
            daily_pct = round((daily_pnl / max(1.0, total_equity)) * 100.0, 2) if total_equity > 0 else 0.0

            target["portfolio"]["positions"] = updated_positions
            target["portfolio"]["total_equity"] = total_equity
            target["portfolio"]["unrealized_pnl"] = round(total_unrealized, 2)
            target["portfolio"]["daily_pnl"] = round(daily_pnl, 2)
            target["portfolio"]["daily_pnl_percentage"] = daily_pct
            target["portfolio"]["net_exposure"] = round(net_exposure, 2)
            target["portfolio"]["margin_usage"] = margin_usage
            target["portfolio"]["var_99"] = round(gross * 0.028, 2)
            target["portfolio"]["updated_at"] = datetime.now(timezone.utc).isoformat()

            self._persist_to_disk()

    def _find_customer_raw(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Finds raw customer dictionary by customer_id or email."""
        clean_id = (customer_id or "").strip().lower()
        for cid, c in self._data["customers"].items():
            if cid.lower() == clean_id or c.get("email", "").lower() == clean_id:
                return c
        return None

    def _sanitize_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Returns customer data without sensitive password hash."""
        portfolio = customer_data.get("portfolio", {})
        positions = portfolio.get("positions", [])
        return {
            "customer_id": customer_data.get("customer_id"),
            "name": customer_data.get("name"),
            "email": customer_data.get("email"),
            "account_tier": customer_data.get("account_tier", "PRO_QUANT"),
            "cash_balance": customer_data.get("cash_balance", 500000.0),
            "created_at": customer_data.get("created_at"),
            "last_login": customer_data.get("last_login"),
            "positions_count": len(positions),
            "total_equity": portfolio.get("total_equity", customer_data.get("cash_balance", 500000.0))
        }


# Global singleton instance
customer_db = CustomerPortfolioDB()
