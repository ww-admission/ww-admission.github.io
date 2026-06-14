<?php

namespace Database\Factories;

use App\Models\Candidature;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CandidatureFactory extends Factory
{
    protected $model = Candidature::class;

    public function definition(): array
    {
        return [
            'user_id'     => User::factory(),
            'destination' => $this->faker->randomElement(['chine', 'ghana', 'russie']),
            'programme'   => $this->faker->randomElement(['Médecine', 'Informatique', 'Économie', 'Droit', 'Ingénierie']),
            'niveau_vise' => $this->faker->randomElement(['Licence', 'Master', 'Doctorat']),
            'status'      => $this->faker->randomElement(['pending', 'reviewing', 'accepted', 'rejected', 'on_hold']),
            'personal_info' => [
                'nom'          => $this->faker->lastName(),
                'prenom'       => $this->faker->firstName(),
                'email'        => $this->faker->safeEmail(),
                'telephone'    => $this->faker->phoneNumber(),
                'nationalite'  => 'Gabonaise',
            ],
            'academic_info' => [
                'niveauEtude'   => 'Baccalauréat',
                'etablissement' => 'Lycée national Léon Mba',
                'specialite'    => $this->faker->randomElement(['Sciences', 'Lettres', 'Économie']),
                'moyenne'       => $this->faker->randomFloat(2, 10, 20),
            ],
            'submitted_at' => $this->faker->dateTimeBetween('-6 months', 'now'),
        ];
    }

    public function pending(): static
    {
        return $this->state(['status' => 'pending']);
    }

    public function accepted(): static
    {
        return $this->state(['status' => 'accepted']);
    }
}
