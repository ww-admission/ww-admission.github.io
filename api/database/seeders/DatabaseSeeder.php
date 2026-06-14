<?php

namespace Database\Seeders;

use App\Models\Candidature;
use App\Models\CandidatureComment;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Super Admin (toujours créé) ────────────────────────────────
        $email    = env('SUPER_ADMIN_EMAIL');
        $password = env('SUPER_ADMIN_PASSWORD');

        if (! $email || ! $password) {
            $this->command->error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env');
            return;
        }

        $admin = User::updateOrCreate(
            ['email' => $email],
            ['name' => 'Admin WWA', 'password' => Hash::make($password), 'role' => 'admin']
        );

        // ── Données de démo (dev/test uniquement) ─────────────────────
        if (app()->environment('production')) return;

        $candidate1 = User::factory()->create([
            'name'     => 'Jean-Baptiste Ondo',
            'email'    => 'jb.ondo@example.com',
            'password' => Hash::make('password'),
            'role'     => 'candidate',
        ]);

        $candidate2 = User::factory()->create([
            'name'     => 'Prisca Moussavou',
            'email'    => 'prisca.moussavou@example.com',
            'password' => Hash::make('password'),
            'role'     => 'candidate',
        ]);

        $cand1 = Candidature::factory()->create([
            'user_id'       => $candidate1->id,
            'destination'   => 'chine',
            'programme'     => 'Médecine générale',
            'niveau_vise'   => 'Licence',
            'status'        => 'reviewing',
            'personal_info' => ['nom' => 'Ondo', 'prenom' => 'Jean-Baptiste', 'telephone' => '+241 06 12 34 56'],
            'academic_info' => ['niveauEtude' => 'Baccalauréat', 'etablissement' => 'Lycée Léon Mba', 'moyenne' => '14.5'],
            'submitted_at'  => now()->subDays(15),
        ]);

        $cand2 = Candidature::factory()->create([
            'user_id'       => $candidate2->id,
            'destination'   => 'ghana',
            'programme'     => 'Informatique',
            'niveau_vise'   => 'Master',
            'status'        => 'pending',
            'personal_info' => ['nom' => 'Moussavou', 'prenom' => 'Prisca', 'telephone' => '+241 07 98 76 54'],
            'academic_info' => ['niveauEtude' => 'Licence', 'etablissement' => 'Université Omar Bongo', 'moyenne' => '15.2'],
            'submitted_at'  => now()->subDays(5),
        ]);

        CandidatureComment::create([
            'candidature_id' => $cand1->id,
            'user_id'        => $admin->id,
            'content'        => 'Dossier complet, en attente de la traduction des documents académiques.',
        ]);

        $conv1 = Conversation::create([
            'candidate_id'   => $candidate1->id,
            'candidature_id' => $cand1->id,
        ]);

        Message::create([
            'conversation_id' => $conv1->id,
            'sender_id'       => $admin->id,
            'content'         => "Bonjour Jean-Baptiste, nous avons bien reçu votre dossier. Pouvez-vous nous envoyer votre diplôme de baccalauréat en format PDF ?",
            'read_at'         => now()->subHours(2),
        ]);

        Message::create([
            'conversation_id' => $conv1->id,
            'sender_id'       => $candidate1->id,
            'content'         => "Bonjour, oui bien sûr ! Je vais scanner le document et vous l'envoyer dans la journée.",
            'read_at'         => now()->subHour(),
        ]);

        $conv2 = Conversation::create([
            'candidate_id'   => $candidate2->id,
            'candidature_id' => $cand2->id,
        ]);

        Message::create([
            'conversation_id' => $conv2->id,
            'sender_id'       => $admin->id,
            'content'         => "Bienvenue Prisca ! Votre candidature pour le Master Informatique au Ghana a bien été reçue.",
        ]);
    }
}
