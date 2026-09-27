<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\HarvestRecord;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HarvestRecordController extends Controller
{
    private const UNITS = ['kg', 'bunch', 'piece', 'head', 'pack'];

        public function store(Request $request)
    {
        [$data, $product] = $this->validatedHarvest($request);

        $harvestRecord = new HarvestRecord([
            ...$data,
            'product_name' => $product->name,
            'notes' => filled($data['notes'] ?? null) ? trim($data['notes']) : null,
        ]);
        $harvestRecord->user_id = $request->user()->id;
        $harvestRecord->save();

        if ($request->wantsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return response()->json(['status' => 'success', 'message' => $this->createdMessage($harvestRecord)]);
        }

        return redirect()->back()->with('status', $this->createdMessage($harvestRecord));
    }

    public function update(Request $request, HarvestRecord $harvestRecord)
    {
        $this->ensureOwner($request, $harvestRecord);
        [$data, $product] = $this->validatedHarvest($request);

        $harvestRecord->update([
            ...$data,
            'product_name' => $product->name,
            'notes' => filled($data['notes'] ?? null) ? trim($data['notes']) : null,
        ]);

        if ($request->wantsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return response()->json(['status' => 'success', 'message' => 'Harvest record updated successfully.']);
        }

        return redirect('/seller/dashboard?section=harvest-records')
            ->with('status', 'Harvest record updated successfully.');
    }

    public function destroy(Request $request, HarvestRecord $harvestRecord)
    {
        $this->ensureOwner($request, $harvestRecord);
        $productName = $harvestRecord->product_name;
        $harvestRecord->delete();

        if ($request->wantsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return response()->json(['status' => 'success', 'message' => "Harvest record for {$productName} deleted successfully."]);
        }

        return redirect('/seller/dashboard?section=harvest-records')
            ->with('status', "Harvest record for {$productName} deleted successfully.");
    }

    /**
     * @return array{0: array<string, mixed>, 1: Product}
     */
    private function validatedHarvest(Request $request): array
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', Rule::exists('products', 'id')->where('user_id', $request->user()->id)],
            'quantity' => ['required', 'numeric', 'gt:0', 'max:999999999.999', 'decimal:0,3'],
            'unit' => ['required', Rule::in(self::UNITS)],
            'harvest_date' => ['required', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        return [$data, Product::where('user_id', $request->user()->id)->findOrFail($data['product_id'])];
    }

    private function ensureOwner(Request $request, HarvestRecord $harvestRecord): void
    {
        abort_unless($harvestRecord->user_id === $request->user()->id, 404);
    }

    private function createdMessage(HarvestRecord $harvestRecord): string
    {
        $quantity = rtrim(rtrim(number_format((float) $harvestRecord->quantity, 3, '.', ''), '0'), '.');
        $date = $harvestRecord->harvest_date->format('F j, Y');

        return "Harvest recorded successfully. {$quantity} {$harvestRecord->unit} of {$harvestRecord->product_name} were recorded for {$date}.";
    }
}
