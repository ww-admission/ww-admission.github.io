<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'    => 'required|string|max:200',
            'email'   => 'required|email|max:254',
            'phone'   => 'nullable|string|max:30',
            'subject' => 'nullable|string|max:300',
            'message' => 'required|string|min:10|max:10000',
        ];
    }
}
