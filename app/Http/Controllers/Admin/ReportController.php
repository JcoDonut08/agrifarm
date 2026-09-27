<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Report;

class ReportController extends Controller
{
    public function destroy(Report $report)
    {
        $report->delete();
        return back()->with("success", "Report deleted successfully.");
    }
}

