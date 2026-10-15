<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class AboutController extends Controller
{
    public function __invoke(): Response
    {
        $mapId = trim((string) config('urban_gardens.my_maps_id'));
        $validMap = preg_match('/\A[A-Za-z0-9_-]{10,200}\z/', $mapId) === 1;

        return Inertia::render('About', [
            'urbanGardens' => json_decode(file_get_contents(resource_path('data/cenro-partner-gardens.json')), true, flags: JSON_THROW_ON_ERROR),
            'gardenMapEmbedUrl' => $validMap ? 'https://www.google.com/maps/d/embed?mid='.rawurlencode($mapId) : null,
            'gardenMapUrl' => $validMap ? 'https://www.google.com/maps/d/viewer?mid='.rawurlencode($mapId) : null,
        ]);
    }
}
