<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminDashboardService;
use App\Services\AdminSellerService;
use App\Services\AuditLogService;
use App\Services\BarangayMonitoringService;
use App\Services\WeatherService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected AdminDashboardService $dashboardService,
        protected AdminSellerService $sellerService,
        protected AuditLogService $auditLogService,
        protected BarangayMonitoringService $barangayMonitoringService,
        protected WeatherService $weatherService
    ) {
    }

    public function __invoke(Request $request): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'dashboard' => $this->dashboardService->data($request->user()),
            'sellerManagement' => [
                'sellers' => $this->sellerService->sellers(),
                'barangays' => $this->sellerService->barangays(),
            ],
            'auditLogs' => $this->auditLogService->logs(),
            'monitoringData' => $this->barangayMonitoringService->data(),
            'weather' => $this->weatherService->current(),
        ]);
    }
}
