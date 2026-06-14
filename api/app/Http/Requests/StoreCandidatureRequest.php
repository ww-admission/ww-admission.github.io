<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCandidatureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalise les clés avant la validation.
     * Accepte l'alias camelCase niveauVise (frontend) et reconstruit
     * personal_info / academic_info / complementary_info depuis les champs plats
     * envoyés en FormData ou JSON par ApplicationForm.
     */
    protected function prepareForValidation(): void
    {
        $merge = [];

        // niveauVise (camelCase frontend) → niveau_vise (snake_case Laravel)
        if (!$this->has('niveau_vise') && $this->has('niveauVise')) {
            $merge['niveau_vise'] = $this->input('niveauVise');
        }

        // Reconstruire personal_info depuis les champs plats si absent
        if (!$this->has('personal_info') && (
            $this->has('nom') || $this->has('prenom') || $this->has('email')
        )) {
            $personal = array_filter([
                'nom'                   => $this->input('nom'),
                'prenom'                => $this->input('prenom'),
                'email'                 => $this->input('email'),
                'telephone'             => $this->input('telephone_complet') ?? $this->input('telephone'),
                'nationalites'          => $this->input('nationalites'),
                'sexe'                  => $this->input('sexe'),
                'dateNaissance'         => $this->input('dateNaissance') ?? $this->input('date_naissance'),
                'lieuNaissance'         => $this->input('lieuNaissance') ?? $this->input('lieu_naissance'),
                'situationMatrimoniale' => $this->input('situationMatrimoniale'),
                'numPasseport'          => $this->input('numPasseport') ?? $this->input('num_passeport'),
                'adresse'               => $this->input('adresse'),
                'ville'                 => $this->input('ville'),
                'pays'                  => $this->input('pays'),
            ], fn ($v) => $v !== null && $v !== '');
            if (!empty($personal)) {
                $merge['personal_info'] = $personal;
            }
        }

        // Reconstruire academic_info depuis les champs plats si absent
        if (!$this->has('academic_info') && (
            $this->has('niveauEtude') || $this->has('etablissement')
        )) {
            $academic = array_filter([
                'niveauEtude'   => $this->input('niveauEtude') ?? $this->input('niveau_etude'),
                'etablissement' => $this->input('etablissement'),
                'specialite'    => $this->input('specialite') !== 'autre'
                    ? $this->input('specialite')
                    : $this->input('specialiteAutre'),
                'moyenne'       => $this->input('moyenne'),
            ], fn ($v) => $v !== null && $v !== '');
            if (!empty($academic)) {
                $merge['academic_info'] = $academic;
            }
        }

        // Reconstruire complementary_info depuis les champs plats si absent
        if (!$this->has('complementary_info') && (
            $this->has('sourceFinancement') || $this->has('faculte')
        )) {
            $complementary = array_filter([
                'sourceFinancement' => $this->input('sourceFinancement'),
                'dejaEtudieChine'   => $this->input('deja_etudie_chine'),
                'faculte'           => $this->input('faculte'),
            ], fn ($v) => $v !== null && $v !== '');
            if (!empty($complementary)) {
                $merge['complementary_info'] = $complementary;
            }
        }

        if (!empty($merge)) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        return [
            'reference'                      => 'nullable|string|max:36',
            'destination'                    => 'required|string|max:100',
            'programme'                      => 'required|string|max:200',
            'niveau_vise'                    => 'required|string|max:100',
            'personal_info'                  => 'nullable|array',
            'personal_info.nom'              => 'nullable|string|max:100',
            'personal_info.prenom'           => 'nullable|string|max:100',
            'personal_info.email'            => 'nullable|email',
            'personal_info.telephone'        => 'nullable|string|max:30',
            'academic_info'                  => 'nullable|array',
            'documents'                      => 'nullable|array',
            'complementary_info'             => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'destination.required' => 'La destination est requise.',
            'programme.required'   => 'Le programme est requis.',
            'niveau_vise.required' => 'Le niveau visé est requis.',
        ];
    }
}
