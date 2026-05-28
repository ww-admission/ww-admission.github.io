<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $email    = env('SUPER_ADMIN_EMAIL');
        $password = env('SUPER_ADMIN_PASSWORD');

        if (! $email || ! $password) {
            $this->command->error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env');
            return;
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name'     => 'Admin WWA',
                'password' => Hash::make($password),
                'role'     => 'admin',
            ]
        );
    }
}
