<?php

namespace App\Console\Commands;

use App\Services\ForecastService;
use Illuminate\Console\Command;
use Illuminate\Http\UploadedFile;

class CheckForecastRuntime extends Command
{
    protected $signature = 'forecast:check';

    protected $description = 'Check the configured Python forecast runtime without saving a seller result';

    public function handle(ForecastService $forecasts): int
    {
        $file = new UploadedFile(base_path('docs/sample-data/synthetic_harvest_1_year.csv'), 'sample.csv', 'text/csv', null, true);
        $result = $forecasts->generateForecast($file);

        if (! $result || isset($result['error'])) {
            $this->error('Forecast runtime check failed. Check FORECAST_PYTHON_BIN, dependencies, process permissions and the Laravel log.');

            return self::FAILURE;
        }

        $this->info('Forecast runtime OK: schema '.$result['schema_version'].', '.count($result['crops']).' crops, '.count($result['forecast_months']).' months. No forecast run was saved.');

        return self::SUCCESS;
    }
}
