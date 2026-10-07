<?php

namespace App\Http\Requests\Seller;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class StorePlantingPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Seller;
    }

    public function rules(): array
    {
        return [
            'crop' => ['required', 'string', 'max:100'],
            'planting_month' => ['required', 'date_format:Y-m'],
            'language' => ['nullable', 'in:english,filipino'],
        ];
    }

    public function messages(): array
    {
        $filipino = $this->input('language') === 'filipino';

        return [
            'crop.required' => $filipino ? 'Pumili ng mungkahing pananim.' : 'Choose a recommended crop.',
            'crop.string' => $filipino ? 'Pumili ng wastong pananim.' : 'Choose a valid crop.',
            'crop.max' => $filipino ? 'Masyadong mahaba ang pangalan ng pananim.' : 'The crop name is too long.',
            'planting_month.required' => $filipino ? 'I-refresh ang pahina upang makita ang buwan ng pagtatanim.' : 'Refresh the page to load the planting month.',
            'planting_month.date_format' => $filipino ? 'I-refresh ang pahina upang makita ang wastong buwan ng pagtatanim.' : 'Refresh the page to load a valid planting month.',
        ];
    }
}
