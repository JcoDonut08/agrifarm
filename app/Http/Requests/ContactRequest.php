<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', 'not_regex:/[\r\n]/'],
            'email' => ['required', 'email:rfc', 'max:254', 'not_regex:/[\r\n]/'],
            'category' => ['required', Rule::in(['inquiry', 'report', 'account', 'other'])],
            'subject' => ['required', 'string', 'max:150', 'not_regex:/[\r\n]/'],
            'message' => ['required', 'string', 'min:20', 'max:5000'],
            'reference' => ['nullable', 'string', 'max:300'],
        ];
    }
}
