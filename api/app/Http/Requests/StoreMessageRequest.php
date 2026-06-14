<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'content'  => 'nullable|string|max:5000',
            'files'    => 'nullable|array|max:5',
            'files.*'  => 'file|max:10240', // 10 Mo par fichier
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $hasContent = filled($this->input('content'));
            $hasFiles   = $this->hasFile('files');
            if (! $hasContent && ! $hasFiles) {
                $v->errors()->add('content', 'Un message ou une pièce jointe est requis.');
            }
        });
    }
}
