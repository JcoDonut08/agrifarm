<?php

namespace App\Console\Commands;

use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Contracts\Console\Isolatable;
use Illuminate\Support\Facades\Process;

class RefreshMonthlyWeather extends Command implements Isolatable
{
    protected $signature = 'weather:refresh {--as-of= : YYYY-MM-DD in Asia/Manila; defaults to today}';

    protected $description = 'Refresh ERA5 history and train/evaluate monthly weather models offline';

    public function handle(): int
    {
        $value = $this->option('as-of') ?: CarbonImmutable::now('Asia/Manila')->toDateString();
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) || ! CarbonImmutable::hasFormat($value, 'Y-m-d')
            || $value < '2026-01-01' || $value > CarbonImmutable::now('Asia/Manila')->toDateString()) {
            $this->error('Use a valid date from 2026-01-01 through today in Asia/Manila.');

            return self::FAILURE;
        }
        $environment = ['PYTHONIOENCODING' => 'utf-8', 'OPENBLAS_NUM_THREADS' => '1', 'OMP_NUM_THREADS' => '1'];
        if (PHP_OS_FAMILY === 'Windows') {
            $environment['SYSTEMROOT'] = getenv('SystemRoot') ?: getenv('SYSTEMROOT') ?: getenv('WINDIR');
        }
        $result = Process::path(base_path())->env($environment)->timeout(1200)->run([
            config('services.forecasting.python_bin'), base_path('python/monthly_weather.py'), '--download', '--as-of', $value,
            '--raw-dir', storage_path('app/private/monthly_weather/raw'),
            '--artifact-dir', storage_path('app/private/monthly_weather/evaluation'),
            '--output', storage_path('app/private/monthly_weather/outlook.json'),
        ], function (string $type, string $output): void {
            $this->output->write($output);
        });

        return $result->successful() ? self::SUCCESS : self::FAILURE;
    }
}
