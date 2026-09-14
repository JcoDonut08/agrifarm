<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', rtrim(env('APP_URL', 'http://localhost'), '/').'/auth/google/callback'),
    ],

    'open_meteo' => [
        'enabled' => env('OPEN_METEO_ENABLED', true),
        'base_url' => env('OPEN_METEO_BASE_URL', 'https://api.open-meteo.com'),
        'location' => env('OPEN_METEO_LOCATION', 'Pasig City'),
        'latitude' => env('OPEN_METEO_LATITUDE', 14.5764),
        'longitude' => env('OPEN_METEO_LONGITUDE', 121.0851),
        'timezone' => env('OPEN_METEO_TIMEZONE', 'Asia/Manila'),
        'cache_minutes' => env('OPEN_METEO_CACHE_MINUTES', 30),
        'stale_hours' => env('OPEN_METEO_STALE_HOURS', 6),
    ],

    'google_weather' => [
        'enabled' => env('GOOGLE_WEATHER_ENABLED', false),
        'api_key' => env('GOOGLE_WEATHER_API_KEY'),
        'base_url' => env('GOOGLE_WEATHER_BASE_URL', 'https://weather.googleapis.com'),
        'location' => env('GOOGLE_WEATHER_LOCATION', env('OPEN_METEO_LOCATION', 'Pasig City')),
        'latitude' => env('GOOGLE_WEATHER_LATITUDE', env('OPEN_METEO_LATITUDE', 14.5764)),
        'longitude' => env('GOOGLE_WEATHER_LONGITUDE', env('OPEN_METEO_LONGITUDE', 121.0851)),
        'timezone' => env('GOOGLE_WEATHER_TIMEZONE', env('OPEN_METEO_TIMEZONE', 'Asia/Manila')),
        'cache_minutes' => env('GOOGLE_WEATHER_CACHE_MINUTES', 30),
        'stale_minutes' => env('GOOGLE_WEATHER_STALE_MINUTES', 60),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
