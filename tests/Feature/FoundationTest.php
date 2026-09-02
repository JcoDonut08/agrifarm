<?php

namespace Tests\Feature;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FoundationTest extends TestCase
{
    public function test_the_foundation_page_is_rendered_with_inertia(): void
    {
        $this->withoutVite();

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Welcome'));
    }
}
