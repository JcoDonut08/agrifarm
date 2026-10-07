<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Requests\Seller\ForecastRequest;
use App\Services\ForecastService;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ForecastController extends Controller
{
    public function store(ForecastRequest $request, ForecastService $forecastService): RedirectResponse
    {
        $result = $forecastService->generateForecast($request->file('harvest_data'));

        if (! $result) {
            return back()->with('forecastError', ['error_code' => 'service_failed', 'details' => []]);
        }

        if (isset($result['error'])) {
            return back()->with('forecastError', $result);
        }

        $request->user()->forecastRuns()->create([
            'result' => $result,
            'source_filename' => mb_substr(basename($request->file('harvest_data')->getClientOriginalName()), 0, 255),
        ]);

        return back();
    }

    public function sample(): BinaryFileResponse
    {
        return response()->download(base_path('docs/sample-data/synthetic_harvest_1_year.csv'), 'sample-harvest.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
