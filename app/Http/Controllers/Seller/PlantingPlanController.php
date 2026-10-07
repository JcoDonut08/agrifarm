<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Requests\Seller\StorePlantingPlanRequest;
use App\Models\PlantingPlan;
use App\Services\ForecastRecommendationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PlantingPlanController extends Controller
{
    public function store(StorePlantingPlanRequest $request, ForecastRecommendationService $recommendations): RedirectResponse
    {
        $data = $request->validated();
        $filipino = ($data['language'] ?? 'english') === 'filipino';
        $run = $request->user()->forecastRuns()->latest('id')->first();
        if (! $run) {
            throw ValidationException::withMessages([
                'crop' => $filipino ? 'Mag-upload muna ng tala ng ani.' : 'Upload harvest records first.',
            ]);
        }

        $result = $recommendations->recommend($run->result, seller: $request->user());
        if ($data['planting_month'] !== $result['planting_month']) {
            throw ValidationException::withMessages([
                'planting_month' => $filipino ? 'Nagbago na ang buwan ng pagtatanim. I-refresh ang pahina at pumili muli.' : 'The planting month has changed. Refresh the page and choose again.',
            ]);
        }

        $crop = collect($result['recommendations'])->firstWhere('crop', $data['crop']);
        if (! $crop) {
            throw ValidationException::withMessages([
                'crop' => $filipino ? 'Nagbago na ang mga mungkahi. I-refresh ang pahina at pumili muli.' : 'The recommendations have changed. Refresh the page and choose again.',
            ]);
        }

        // Save an independent snapshot; a future upload or month must not move a saved plan.
        $request->user()->plantingPlans()->firstOrCreate([
            'crop' => $crop['crop'],
            'planting_month' => CarbonImmutable::parse($result['planting_month'].'-01', 'Asia/Manila'),
        ], [
            'harvest_month' => CarbonImmutable::parse($crop['harvest_month'].'-01', 'Asia/Manila'),
            'days_to_harvest' => $crop['days_to_harvest'],
        ]);

        return back();
    }

    public function destroy(Request $request, PlantingPlan $plantingPlan): RedirectResponse
    {
        abort_unless($plantingPlan->user_id === $request->user()->id, 404);
        $plantingPlan->delete();

        return back();
    }
}
