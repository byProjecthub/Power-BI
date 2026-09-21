<?php
// Shared helpers: JSON output, CORS, input validation

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

function respond($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_NUMERIC_CHECK);
    exit;
}

function valid_year(): int {
    $year = (int)($_GET['year'] ?? 2024);
    if (!in_array($year, [2022, 2023, 2024], true)) {
        respond(['detail' => 'Year must be one of 2022, 2023, 2024'], 404);
    }
    return $year;
}
