<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class HarvestForecastExportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::CenroAdmin;
    }

    public function rules(): array
    {
        return [
            'barangay' => ['required', 'string', Rule::in(array_keys(config('marketplace.barangay_seller_names')))],
            'from' => ['required', 'date_format:Y-m-d', 'after_or_equal:1900-01-01', 'before_or_equal:2100-12-31'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from', 'before_or_equal:2100-12-31'],
            'language' => ['nullable', Rule::in(['english', 'filipino'])],
            'format' => ['sometimes', Rule::in(['csv', 'xlsx'])],
        ];
    }

    public function messages(): array
    {
        if ($this->input('language') !== 'filipino') {
            return [];
        }

        return [
            'barangay.required' => 'Pumili ng barangay.',
            'barangay.in' => 'Pumili ng barangay sa listahan.',
            'from.*' => 'Pumili ng wastong petsa ng simula mula 1900 hanggang 2100.',
            'to.*' => 'Pumili ng wastong petsa ng pagtatapos na hindi mas maaga sa simula, hanggang 2100.',
        ];
    }
}
