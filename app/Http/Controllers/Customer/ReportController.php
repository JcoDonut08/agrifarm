<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            "product_id" => "nullable|integer|exists:products,id",
            "product_name" => "nullable|string|max:255",
            "seller_name" => "nullable|string|max:255",
            "barangay" => "nullable|string|max:100",
            "type" => "required|string|max:50",
            "description" => "required|string|max:1000",
        ]);

        Report::create([
            "reporter_name" => $request->user()?->name ?? "Anonymous",
            "seller_name" => $validated["seller_name"] ?? null,
            "product_id" => $validated["product_id"] ?? null,
            "product_name" => $validated["product_name"] ?? null,
            "barangay" => $validated["barangay"] ?? null,
            "type" => $validated["type"],
            "description" => $validated["description"],
            "status" => "Pending",
        ]);

        if (function_exists("fastcgi_finish_request")) {
            fastcgi_finish_request();
        }

        return response()->json(["success" => true]);
    }
}

