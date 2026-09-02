<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class LegalPageController extends Controller
{
    public function terms(): Response
    {
        return Inertia::render('Legal/Terms');
    }

    public function privacy(): Response
    {
        return Inertia::render('Legal/Privacy');
    }
}
