<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\HarvestForecastExportRequest;
use App\Services\BarangayHarvestExportService;

class HarvestForecastExportController extends Controller
{
    public function preview(HarvestForecastExportRequest $request, BarangayHarvestExportService $service)
    {
        return response()->json($service->prepare($request->validated())['preview'], 200, ['Cache-Control' => 'no-store']);
    }

    public function download(HarvestForecastExportRequest $request, BarangayHarvestExportService $service)
    {
        $export = $service->prepare($request->validated());
        if (! $export['preview']['can_export']) {
            return response()->json($export['preview'], 422);
        }

        // The existing browser ExcelJS exporter writes this freshly checked data
        // to an XLSX worksheet with the importer headers in its first row.
        if ($request->input('format') === 'xlsx') {
            return response()->json([
                'preview' => $export['preview'],
                'headers' => ['Month', 'Vegetable Crop', 'Harvest (kg)', 'Barangay'],
                'filename' => substr($export['filename'], 0, -4).'.xlsx',
            ], 200, ['Cache-Control' => 'no-store']);
        }

        return response()->streamDownload(function () use ($export) {
            echo $export['csv'];
        }, $export['filename'], ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'no-store']);
    }
}
