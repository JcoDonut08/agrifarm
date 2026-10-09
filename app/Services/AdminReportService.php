<?php

namespace App\Services;

use App\Models\HarvestRecord;
use App\Models\PendingRegistration;
use App\Models\User;
use App\Models\WalkInOrder;
use Illuminate\Support\Facades\DB;

class AdminReportService
{
    public function data(): array
    {
        return [
            'harvestRecords'       => $this->harvestRecords(),
            'walkInOrders'         => $this->walkInOrders(),
            'sellers'              => $this->sellers(),
            'pendingRegistrations' => $this->pendingRegistrations(),
        ];
    }

    private function harvestRecords(): array
    {
        return HarvestRecord::query()
            ->join('users', 'harvest_records.user_id', '=', 'users.id')
            ->leftJoin('products', 'harvest_records.product_id', '=', 'products.id')
            ->select([
                'harvest_records.id',
                'harvest_records.product_name',
                'harvest_records.quantity',
                'harvest_records.unit',
                'harvest_records.harvest_date',
                'users.barangay',
            ])
            ->orderBy('harvest_records.harvest_date')
            ->get()
            ->toArray();
    }

    private function walkInOrders(): array
    {
        return WalkInOrder::query()
            ->join('users', 'walk_in_orders.user_id', '=', 'users.id')
            ->select([
                'walk_in_orders.id',
                'walk_in_orders.product_name',
                'walk_in_orders.product_id',
                'walk_in_orders.quantity',
                'walk_in_orders.unit',
                'walk_in_orders.unit_price',
                'walk_in_orders.total',
                'walk_in_orders.status',
                'walk_in_orders.created_at',
                'walk_in_orders.delivered_at',
                'users.barangay',
            ])
            ->orderBy('walk_in_orders.created_at')
            ->get()
            ->toArray();
    }

    private function sellers(): array
    {
        return User::query()
            ->where('role', 'seller')
            ->select(['id', 'name', 'barangay', 'account_status', 'created_at'])
            ->orderBy('barangay')
            ->orderBy('name')
            ->get()
            ->toArray();
    }

    private function pendingRegistrations(): array
    {
        return PendingRegistration::query()
            ->select(['id', 'name', 'email', 'created_at'])
            ->orderBy('created_at')
            ->get()
            ->toArray();
    }
}
