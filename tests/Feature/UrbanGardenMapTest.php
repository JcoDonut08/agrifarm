<?php

namespace Tests\Feature;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UrbanGardenMapTest extends TestCase
{
    public function test_about_page_uses_only_the_twelve_cenro_listed_gardens_in_partner_barangays(): void
    {
        config(['urban_gardens.my_maps_id' => 'public-garden-map-12345']);

        $this->get('/about')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('About')->has('urbanGardens', 12)
            ->where('urbanGardens', function ($gardens) {
                $rows = collect($gardens);

                return $rows->countBy('barangay')->sortKeys()->all() === ['Maybunga' => 4, 'Rosario' => 6, 'Sto. Tomas' => 2]
                    && $rows->pluck('id')->unique()->count() === 12
                    && $rows->every(fn ($garden) => ! empty($garden['address']) && ! empty($garden['sourceReference']))
                    && $rows->contains(fn ($garden) => str_contains($garden['address'], 'No. 38 Charisma'))
                    && $rows->contains(fn ($garden) => str_contains($garden['address'], 'No. 40 Charisma'));
            })
            ->where('gardenMapEmbedUrl', 'https://www.google.com/maps/d/embed?mid=public-garden-map-12345')
            ->where('gardenMapUrl', 'https://www.google.com/maps/d/viewer?mid=public-garden-map-12345'));
    }

    public function test_unconfigured_or_invalid_map_ids_keep_the_directory_available_without_an_iframe_url(): void
    {
        foreach ([null, '', 'https://untrusted.example/map', '<script>alert(1)</script>', 'invalid?mid=anything'] as $mapId) {
            config(['urban_gardens.my_maps_id' => $mapId]);
            $this->get('/about')->assertOk()->assertInertia(fn (Assert $page) => $page
                ->has('urbanGardens', 12)->where('gardenMapEmbedUrl', null)->where('gardenMapUrl', null));
        }
    }
}
