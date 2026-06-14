<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadAttachmentRequest extends FormRequest
{
    private const ALLOWED_MIMES = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    private const MAX_SIZE_KB = 10240; // 10 Mo

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $mimes = implode(',', ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx']);

        return [
            'file'             => "required|file|mimes:{$mimes}|max:" . self::MAX_SIZE_KB,
            'attachable_type'  => 'required|in:candidature,contact',
            'attachable_id'    => 'required|integer|min:1',
            'field_name'       => 'nullable|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'file.mimes'   => 'Formats acceptés : PDF, JPG, PNG, WEBP, DOC, DOCX.',
            'file.max'     => 'La taille maximale est 10 Mo.',
            'file.required'=> 'Aucun fichier reçu.',
        ];
    }
}
