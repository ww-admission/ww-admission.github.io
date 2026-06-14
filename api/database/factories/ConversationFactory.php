<?php

namespace Database\Factories;

use App\Models\Candidature;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConversationFactory extends Factory
{
    protected $model = Conversation::class;

    public function definition(): array
    {
        return [
            'candidate_id'   => User::factory()->create(['role' => 'candidate'])->id,
            'candidature_id' => null,
        ];
    }
}
