<?php
// REST API router — same contract as the FastAPI version.
// Usage: /api/?endpoint=summary&year=2024
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers.php';

$endpoint = $_GET['endpoint'] ?? '';
$year = valid_year();

switch ($endpoint) {

    case 'summary':
        $stmt = $pdo->prepare(
            "SELECT ROUND(SUM(sales),2) AS total_sales, ROUND(SUM(profit),2) AS total_profit,
                    ROUND(SUM(profit)*100.0/SUM(sales),1) AS margin_pct,
                    COUNT(*) AS order_count, SUM(quantity) AS units_sold
             FROM orders WHERE YEAR(order_date) = ?");
        $stmt->execute([$year]);
        $row = $stmt->fetch();
        $prev = $pdo->prepare("SELECT SUM(sales) FROM orders WHERE YEAR(order_date) = ?");
        $prev->execute([$year - 1]);
        $prevSales = (float)$prev->fetchColumn();
        $row['yoy_growth_pct'] = $prevSales ? round(($row['total_sales'] / $prevSales - 1) * 100, 1) : null;
        respond($row);

    case 'trends':
        $stmt = $pdo->prepare(
            "SELECT MONTH(order_date) AS month, ROUND(SUM(sales),2) AS sales, ROUND(SUM(profit),2) AS profit
             FROM orders WHERE YEAR(order_date) = ?
             GROUP BY month ORDER BY month");
        $stmt->execute([$year]);
        $rows = $stmt->fetchAll();
        // 3-month moving average, computed in PHP
        $window = [];
        foreach ($rows as $i => &$r) {
            $window[] = $r['sales'];
            if (count($window) > 3) array_shift($window);
            $r['moving_avg'] = round(array_sum($window) / count($window), 2);
        }
        respond($rows);

    case 'products':
        $n = min(max((int)($_GET['n'] ?? 10), 1), 50);
        $stmt = $pdo->prepare(
            "SELECT p.name, p.category, p.sub_category,
                    ROUND(SUM(o.sales),2) AS sales, ROUND(SUM(o.profit),2) AS profit,
                    SUM(o.quantity) AS units
             FROM orders o JOIN products p ON o.product_id = p.product_id
             WHERE YEAR(o.order_date) = ?
             GROUP BY p.product_id ORDER BY sales DESC LIMIT $n");
        $stmt->execute([$year]);
        $rows = $stmt->fetchAll();
        $total = $pdo->prepare("SELECT SUM(sales) FROM orders WHERE YEAR(order_date) = ?");
        $total->execute([$year]);
        $grand = (float)$total->fetchColumn();
        $cum = 0;
        foreach ($rows as &$r) {
            $r['sales_share_pct'] = round($r['sales'] / $grand * 100, 1);
            $cum += $r['sales_share_pct'];
            $r['cum_share_pct'] = round($cum, 1);
        }
        respond($rows);

    case 'regions':
        $stmt = $pdo->prepare(
            "SELECT a.region, ROUND(a.sales,2) AS actual_sales, t.target_sales,
                    ROUND(a.sales - t.target_sales, 2) AS variance,
                    ROUND((a.sales - t.target_sales)*100.0/t.target_sales, 1) AS variance_pct
             FROM (SELECT c.region, SUM(o.sales) AS sales
                   FROM orders o JOIN customers c ON o.customer_id = c.customer_id
                   WHERE YEAR(o.order_date) = ? GROUP BY c.region) a
             JOIN (SELECT region, SUM(target_sales) AS target_sales
                   FROM targets WHERE LEFT(month,4) = ? GROUP BY region) t
               ON a.region = t.region
             ORDER BY actual_sales DESC");
        $stmt->execute([$year, (string)$year]);
        respond($stmt->fetchAll());

    case 'variance':
        $stmt = $pdo->prepare(
            "SELECT t.month, t.region, t.target_sales,
                    ROUND(COALESCE(a.sales,0),2) AS actual_sales,
                    ROUND((COALESCE(a.sales,0)-t.target_sales)*100.0/t.target_sales,1) AS variance_pct
             FROM targets t
             LEFT JOIN (SELECT DATE_FORMAT(o.order_date,'%Y-%m') AS month, c.region, SUM(o.sales) AS sales
                        FROM orders o JOIN customers c ON o.customer_id = c.customer_id
                        GROUP BY month, c.region) a
               ON a.month = t.month AND a.region = t.region
             WHERE LEFT(t.month,4) = ?
             ORDER BY t.month, t.region");
        $stmt->execute([(string)$year]);
        respond($stmt->fetchAll());

    default:
        respond(['detail' => 'Unknown endpoint. Use: summary, trends, products, regions, variance'], 404);
}
