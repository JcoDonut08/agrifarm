<?php

namespace App\Http\Requests\Seller;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class ForecastRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Seller;
    }

    public function rules(): array
    {
        return [
            'harvest_data' => ['required', 'file', 'mimes:csv,txt,xlsx', 'extensions:csv,txt,xlsx', 'max:5120'],
            'language' => ['nullable', 'in:english,filipino'],
        ];
    }

    public function messages(): array
    {
        $filipino = $this->input('language') === 'filipino';

        return [
            'harvest_data.required' => $filipino ? 'Pumili muna ng file ng ani.' : 'Choose a harvest file first.',
            'harvest_data.file' => $filipino ? 'Hindi mabasa ang na-upload na file.' : 'The uploaded file could not be read.',
            'harvest_data.mimes' => $filipino ? 'CSV o Excel (.xlsx) lamang ang maaaring i-upload.' : 'Upload a CSV or Excel (.xlsx) file.',
            'harvest_data.extensions' => $filipino ? 'CSV o Excel (.xlsx) lamang ang maaaring i-upload.' : 'Upload a CSV or Excel (.xlsx) file.',
            'harvest_data.max' => $filipino ? 'Hanggang 5 MB lamang ang file ng ani.' : 'The harvest file must be no larger than 5 MB.',
        ];
    }
}
