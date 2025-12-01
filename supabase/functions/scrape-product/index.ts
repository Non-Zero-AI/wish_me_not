import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

console.log("Scraper function up and running!");

serve(async (req) => {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "No URL provided" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" } 
      });
    }

    console.log(`Scraping URL: ${url}`);

    // Fetch the HTML with a standard User-Agent to avoid being blocked
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
       throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // --- Extraction Logic ---

    // 1. Meta Tags (OpenGraph / Twitter / Schema)
    let title = 
      $('meta[property="og:title"]').attr('content') || 
      $('meta[name="twitter:title"]').attr('content') || 
      $('title').text().trim();

    let image = 
      $('meta[property="og:image"]').attr('content') || 
      $('meta[name="twitter:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href');

    let price = 
      $('meta[property="product:price:amount"]').attr('content') || 
      $('meta[property="og:price:amount"]').attr('content');
    
    let currency = 
      $('meta[property="product:price:currency"]').attr('content') || 
      $('meta[property="og:price:currency"]').attr('content') || 'USD';

    // 2. JSON-LD Schema fallback (Very common in e-commerce)
    if (!price || !image) {
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html() || '{}');
          
          // Helper to find price in deep objects
          const findPrice = (obj) => {
             if (!obj) return null;
             if (obj['@type'] === 'Product' || obj['@type'] === 'Offer') {
                 if (obj.price) return obj.price;
                 if (obj.offers) {
                     if (Array.isArray(obj.offers)) return obj.offers[0].price;
                     return obj.offers.price;
                 }
             }
             return null;
          };

          const foundPrice = findPrice(json);
          if (foundPrice && !price) price = foundPrice;
          
          if (json.image && !image) {
              image = Array.isArray(json.image) ? json.image[0] : json.image;
          }
          if (json.name && !title) title = json.name;

        } catch (e) {
           // Ignore json parse errors
        }
      });
    }

    // 3. Regex Heuristics (Last Resort for Price)
    if (!price) {
       // Look for patterns like $123.45 or 123.45 USD in visible text
       // This is risky but better than nothing
       const bodyText = $('body').text();
       const priceRegex = /\$\s?(\d{1,3}(,\d{3})*(\.\d{2})?)/;
       const match = bodyText.match(priceRegex);
       if (match) {
           price = match[1].replace(/,/g, '');
       }
    }

    // Clean up fields
    if (title) title = title.replace(/\n/g, ' ').trim();
    
    const result = {
        title: title || "New Wish",
        price: price || "0",
        image: image || null,
        currency: currency,
        url: url
    };

    console.log("Scrape Success:", result);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Scrape Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
