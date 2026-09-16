<?php

return [
    // PostgreSQL/MySQL search the product table directly. SQLite tests use Scout's collection driver.
    'driver' => env('SCOUT_DRIVER', in_array(env('DB_CONNECTION', 'sqlite'), ['pgsql', 'mysql'], true) ? 'database' : 'collection'),
];
