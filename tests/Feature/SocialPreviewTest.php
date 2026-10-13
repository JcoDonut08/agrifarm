<?php

namespace Tests\Feature;

use App\Support\SocialPreview;
use DOMDocument;
use DOMXPath;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class SocialPreviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['app.url' => 'https://agrifarm.example']);
    }

    public function test_crawlers_receive_the_site_preview_without_running_javascript(): void
    {
        foreach (['/', '/about', '/contact'] as $url) {
            $response = $this->withHeader('User-Agent', 'facebookexternalhit/1.1')->get($url)->assertOk();
            $document = new DOMDocument;
            $document->loadHTML($response->getContent(), LIBXML_NOERROR | LIBXML_NOWARNING);
            $head = new DOMXPath($document);
            $this->assertSame('AgriFarm', $this->meta($head, 'property', 'og:title'));
            $this->assertSame('Fresh harvests. Stronger communities. A greener Pasig.', $this->meta($head, 'property', 'og:description'));
            $this->assertSame('https://agrifarm.example'.$url, $this->meta($head, 'property', 'og:url'));
            $this->assertSame('https://agrifarm.example/images/agrifarm-about-share-v2.jpg', $this->meta($head, 'property', 'og:image'));
            $this->assertSame('image/jpeg', $this->meta($head, 'property', 'og:image:type'));
            $this->assertSame('1200', $this->meta($head, 'property', 'og:image:width'));
            $this->assertSame('630', $this->meta($head, 'property', 'og:image:height'));
            $this->assertSame('summary_large_image', $this->meta($head, 'name', 'twitter:card'));
            $this->assertSame($this->meta($head, 'property', 'og:image'), $this->meta($head, 'name', 'twitter:image'));
        }
    }

    public function test_share_image_is_a_small_landscape_jpeg(): void
    {
        $file = public_path('images/agrifarm-about-share-v2.jpg');
        $size = getimagesize($file);
        $this->assertSame(1200, $size[0]);
        $this->assertSame(630, $size[1]);
        $this->assertSame('image/jpeg', $size['mime']);
        $this->assertLessThan(300_000, filesize($file));
    }

    public function test_metadata_values_are_escaped(): void
    {
        config(['app.url' => 'https://agrifarm.example/" onerror="alert(1)']);
        $tags = implode('', SocialPreview::head(Request::create('/')));
        $this->assertStringNotContainsString(' onerror="', $tags);
        $this->assertStringContainsString('&quot;', $tags);
    }

    public function test_public_share_urls_omit_private_query_parameters(): void
    {
        foreach ([
            '/about?token=private-token' => 'https://agrifarm.example/about',
            '/?page=product&product=seller-1&order=private-order' => 'https://agrifarm.example/?page=product&product=seller-1',
            '/?page=checkout&order=private-order' => 'https://agrifarm.example/',
            '/customer/orders?token=private-token' => 'https://agrifarm.example/',
        ] as $url => $expected) {
            $tags = implode('', SocialPreview::head(Request::create($url)));
            $this->assertStringNotContainsString('private-', $tags);
            $document = new DOMDocument;
            $document->loadHTML('<html><head>'.$tags.'</head></html>', LIBXML_NOERROR | LIBXML_NOWARNING);
            $this->assertSame($expected, $this->meta(new DOMXPath($document), 'property', 'og:url'));
        }
    }

    private function meta(DOMXPath $head, string $attribute, string $name): string
    {
        $elements = $head->query('/html/head/meta[@'.$attribute.'="'.$name.'"]');
        $this->assertCount(1, $elements, 'Expected exactly one '.$name.' tag in the initial HTML head.');

        return $elements->item(0)->getAttribute('content');
    }
}
