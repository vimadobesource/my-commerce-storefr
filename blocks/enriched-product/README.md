# Enriched Product Block

## Purpose

Displays Adobe Commerce product information combined with enrichment data retrieved through API Mesh.

## Configuration

The block expects a SKU to be configured in the page content.

## Data Sources

- Adobe Commerce GraphQL
- App Builder Product Enrichment Action
- Adobe API Mesh

## Displayed Information

- Product name
- SKU
- Price
- Sustainability score
- Estimated delivery
- Enrichment timestamp

## Error Handling

Displays user-friendly messages when:
- SKU is missing
- Product cannot be found
- Mesh endpoint is unavailable
