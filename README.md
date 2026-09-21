# Sales Analytics Dashboard — PHP Version

Full-stack analytics app built with **native PHP (PDO) + MySQL + Chart.js**.
Same data and API contract as the Python/FastAPI version — ideal for showing both stacks.

## Architecture
```
Browser (Chart.js dashboard)  <--HTTP/JSON-->  PHP API (PDO)  <--SQL-->  MySQL
```

## Setup with XAMPP

1. **Start XAMPP**: open the XAMPP Control Panel, start **Apache** and **MySQL**.

2. **Copy the project** into your web root:
   ```
   C:\xampp\htdocs\sales-analytics-php\
   ```

3. **Import the database**:
   - Open `http://localhost/phpmyadmin`
   - Click **Import** -> choose `database/sales_analytics.sql` -> **Go**
   - (The script creates the `sales_analytics` database and all tables.)

4. **Open the dashboard**:
   ```
   http://localhost/sales-analytics-php/public/
   ```

## API endpoints
| Endpoint | Description |
|---|---|
| `api/?endpoint=summary&year=2024` | KPIs: sales, profit, margin, orders, YoY growth |
| `api/?endpoint=trends&year=2024` | Monthly sales/profit + 3-month moving average |
| `api/?endpoint=products&year=2024&n=10` | Top N products with Pareto cumulative share |
| `api/?endpoint=regions&year=2024` | Actual vs target by region |
| `api/?endpoint=variance&year=2024` | Monthly actual vs target per region |

Test an endpoint directly in the browser:
`http://localhost/sales-analytics-php/api/?endpoint=summary&year=2024`

## Project structure
```
sales-analytics-php/
├── api/
│   ├── index.php        # REST router (all 5 endpoints)
│   └── helpers.php      # JSON output, CORS, year validation
├── config/
│   └── database.php     # PDO connection (XAMPP defaults)
├── public/
│   ├── index.html       # Dashboard shell (Chart.js)
│   └── app.js           # Page logic: Overview, Trends, Products, Regions, Targets
└── database/
    └── sales_analytics.sql   # Import via phpMyAdmin
```

## Notes
- MySQL credentials default to root with no password (standard XAMPP).
  Change them in `config/database.php` if yours differ.
- All SQL uses prepared statements - no SQL injection risk.
- Same JSON shapes as the FastAPI version, so either frontend could talk to either backend.
