<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class ForecastService
{
    public function generateForecast(UploadedFile $file): ?array
    {
        $path = null;

        try {
            $extension = strtolower($file->getClientOriginalExtension());
            $path = $file->storeAs('forecasting_temp', Str::uuid().'.'.$extension, 'local');
            if (! $path) {
                return null;
            }

            $environment = ['PYTHONIOENCODING' => 'utf-8', 'OPENBLAS_NUM_THREADS' => '1', 'OMP_NUM_THREADS' => '1'];
            // Windows Python needs SystemRoot to locate the system DLLs. PHP's
            // web SAPI may omit it from the environment passed to Symfony Process.
            if (PHP_OS_FAMILY === 'Windows') {
                $systemRoot = getenv('SystemRoot') ?: getenv('SYSTEMROOT') ?: getenv('WINDIR');
                if ($systemRoot) {
                    $environment['SYSTEMROOT'] = $systemRoot;
                }
            }

            $process = Process::path(base_path('python'))
                ->env($environment)
                ->timeout(config('services.forecasting.timeout'))
                ->run([
                    config('services.forecasting.python_bin'),
                    base_path('python/sarima_forecast.py'),
                    Storage::disk('local')->path($path),
                    '--tuning-seconds', (string) config('services.forecasting.tuning_seconds'),
                ]);
            $result = json_decode(trim($process->output()), true);

            if (is_array($result) && isset($result['error'], $result['error_code']) && $process->exitCode() === 1) {
                return $result;
            }
            if ($process->successful() && is_array($result) && $this->validResult($result)) {
                return $result;
            }

            Log::warning('Forecast process returned an invalid result.', ['exit_code' => $process->exitCode()]);

            return null;
        } catch (Throwable $exception) {
            Log::warning('Forecast process failed.', ['exception' => $exception::class]);

            return null;
        } finally {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
        }
    }

    private function validResult(array $result): bool
    {
        if (($result['schema_version'] ?? null) !== 2 || ! is_array($result['forecast_months'] ?? null)
            || ! array_is_list($result['forecast_months']) || count($result['forecast_months']) !== 12
            || ! is_array($result['crops'] ?? null) || empty($result['crops']) || count($result['crops']) > 70) {
            return false;
        }

        foreach ($result['forecast_months'] as $month) {
            if (! is_string($month) || ! preg_match('/^\\d{4}-(0[1-9]|1[0-2])$/', $month)) {
                return false;
            }
        }
        if (isset($result['dataset'])) {
            $dataset = $result['dataset'];
            if (! is_array($dataset) || ! in_array($dataset['scope'] ?? null, ['personal', 'barangay'], true)) {
                return false;
            }
            if ($dataset['scope'] === 'barangay' && (! is_string($dataset['barangay'] ?? null)
                || trim($dataset['barangay']) === '' || mb_strlen($dataset['barangay']) > 100)) {
                return false;
            }
            if ($dataset['scope'] === 'personal' && ($dataset['barangay'] ?? null) !== null) {
                return false;
            }
            foreach (['record_start_month', 'record_end_month'] as $field) {
                if (! is_string($dataset[$field] ?? null) || ! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $dataset[$field])) {
                    return false;
                }
            }
            if ($dataset['record_start_month'] > $dataset['record_end_month']
                || $dataset['record_end_month'] !== ($result['data_end_month'] ?? null)) {
                return false;
            }
        }
        foreach ($result['crops'] as $details) {
            if (! is_array($details) || ! in_array($details['status'] ?? null, ['success', 'fallback', 'new_crop'], true)
                || ! is_array($details['forecast'] ?? null) || ! array_is_list($details['forecast'])
                || ! in_array($details['unit'] ?? null, ['kg', 'season_strength', 'unavailable'], true)) {
                return false;
            }
            if ($details['unit'] === 'unavailable') {
                if ($details['forecast'] !== [] || $details['status'] === 'success') {
                    return false;
                }

                continue;
            }
            if (count($details['forecast']) !== 12 || ($details['status'] === 'success') !== ($details['unit'] === 'kg')) {
                return false;
            }
            if ($details['status'] === 'success' && (! is_array($details['order'] ?? null)
                || ! array_is_list($details['order']) || count($details['order']) !== 3
                || ! is_array($details['seasonal_order'] ?? null) || ! array_is_list($details['seasonal_order'])
                || count($details['seasonal_order']) !== 4)) {
                return false;
            }
            foreach ($details['forecast'] as $index => $point) {
                if (! is_array($point) || ($point['month'] ?? null) !== $result['forecast_months'][$index]
                    || ! is_numeric($point['value'] ?? null) || ! is_finite((float) $point['value']) || $point['value'] < 0) {
                    return false;
                }
                if ($details['unit'] === 'season_strength' && $point['value'] > 1) {
                    return false;
                }
                if ($details['status'] === 'success') {
                    if (! is_numeric($point['lower'] ?? null) || ! is_numeric($point['upper'] ?? null)
                        || ! is_finite((float) $point['lower']) || ! is_finite((float) $point['upper'])
                        || $point['lower'] < 0 || $point['lower'] > $point['value'] || $point['upper'] < $point['value']) {
                        return false;
                    }
                }
            }
        }

        return true;
    }
}
