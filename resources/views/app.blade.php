<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#065f46">

        @viteReactRefresh
        @vite('resources/js/app.jsx')
        <x-inertia::head />
    </head>
    <body class="antialiased">
        <x-inertia::app />
    </body>
</html>
