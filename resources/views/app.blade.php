<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#065f46">

        <script>
            (() => {
                const savedTheme = localStorage.getItem('agrifarm-theme');
                const dark = savedTheme === 'dark' || ((!savedTheme || savedTheme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);

                document.documentElement.classList.toggle('dark', dark);
                document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
                document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#101210' : '#0c542d');
            })();
        </script>

        @viteReactRefresh
        @vite('resources/js/app.jsx')
        <x-inertia::head />
    </head>
    <body class="antialiased">
        <x-inertia::app />
    </body>
</html>
