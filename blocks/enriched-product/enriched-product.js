import { readBlockConfig } from '../../scripts/aem.js';

const MESH_ENDPOINT =
  'https://edge-sandbox-graph.adobe.io/api/fd6c1431-20c8-41b3-a147-03fdcb61bf1d/graphql';

function formatMoneyAmount (amount) {
  if (!amount || typeof amount.value !== 'number') return '';
  const c = amount.currency;
  const code =
    typeof c === 'string'
      ? c
      : c?.code ?? c?.label ?? '';
  return `${code ? `${code} ` : ''}${amount.value.toFixed(2)}`.trim();
}

function priceAmountFromCatalogProduct (product) {
  const simple = product?.price?.final?.amount;
  if (simple) return simple;
  return product?.priceRange?.minimum?.final?.amount ?? null;
}

async function fetchEnrichedProduct (sku) {
  const query = `
    query GetEnrichedProduct($sku: String!) {
      products(skus: [$sku]) {
        sku
        name
        __typename
        images(roles: []) {
          url
          label
        }
        ... on SimpleProductView {
          price {
            final {
              amount {
                value
                currency
              }
            }
          }
        }
        ... on ComplexProductView {
          priceRange {
            minimum {
              final {
                amount {
                  value
                  currency
                }
              }
            }
          }
        }
      }
      Enrichment_getProductEnrichment(sku: $sku) {
        sku
        name
        sustainabilityScore
        estimatedDelivery
        enrichedAt
      }
    }
  `;

  const response = await fetch(MESH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { sku } }),
  });

  if (!response.ok) {
    throw new Error(`Mesh request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    const msg = payload.errors.map((e) => e.message).join('; ');
    console.error('Mesh GraphQL errors:', payload.errors);
    throw new Error(msg);
  }
  return payload;
}

function renderSustainabilityBadge (score) {
  let label;
  let cssClass;
  if (score >= 80) {
    label = 'Excellent';
    cssClass = 'badge--excellent';
  } else if (score >= 60) {
    label = 'Good';
    cssClass = 'badge--good';
  } else {
    label = 'Fair';
    cssClass = 'badge--fair';
  }
  return `<span class="sustainability-badge ${cssClass}">${label} (${score}/100)</span>`;
}

export default async function decorate (block) {
  const { sku } = readBlockConfig(block);

  if (!sku) {
    block.innerHTML = '<p>No SKU configured for this block.</p>';
    return;
  }

  block.innerHTML = '<p>Loading product details...</p>';

  try {
    const { data } = await fetchEnrichedProduct(sku);

    const catalogRows = data?.products;
    const product = Array.isArray(catalogRows) ? catalogRows[0] : null;
    const enrichment = data?.Enrichment_getProductEnrichment;

    if (!product) {
      block.innerHTML = '<p>Product not found.</p>';
      return;
    }

    const priceLabel = formatMoneyAmount(priceAmountFromCatalogProduct(product));
    const firstImage = product.images?.[0];

    block.innerHTML = `
      <div class="enriched-product__card">
        ${firstImage ? `<img src="${firstImage.url}" alt="${firstImage.label || product.name}" loading="lazy" width="400" height="400" />` : ''}
        <div class="enriched-product__info">
          <h3>${product.name}</h3>
          <p class="enriched-product__sku">SKU: ${product.sku}</p>
          ${priceLabel ? `<p class="enriched-product__price">${priceLabel}</p>` : ''}
          ${enrichment ? `
            <div class="enriched-product__enrichment">
              <p class="enriched-product__sustainability">
                Sustainability: ${renderSustainabilityBadge(enrichment.sustainabilityScore)}
              </p>
              <p class="enriched-product__delivery">
                Estimated Delivery: ${enrichment.estimatedDelivery}
              </p>
              ${enrichment.enrichedAt ? `<p class="enriched-product__meta">Enriched at: ${enrichment.enrichedAt}</p>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Enriched product block failed:', error);
    block.innerHTML = '<p>Unable to load product data.</p>';
  }
}
