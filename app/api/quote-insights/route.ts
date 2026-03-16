import { generateText } from 'ai'

export async function POST(req: Request) {
  const { quote } = await req.json()

  const prompt = `You are an expert FM (facilities management) procurement consultant in the UK. 
A pricing team wants to know if their FM contract price is competitive based on publicly available market data and industry benchmarks.

Here is the quote summary:
- Client: ${quote.clientName}
- Type: ${quote.quoteType === 'tender' ? 'Ongoing FM Contract (Tender/Proposal)' : 'One-Off Small Work (Reactive Quote)'}
- Region: ${quote.regionName}
- Number of sites: ${quote.sites?.length ?? 1}
- Total SFG20 assets: ${quote.assetLines?.length ?? 0}
- Annual contract value (ex. VAT): £${quote.totalYear1?.toLocaleString('en-GB')}
- Annual contract value (inc. VAT): £${quote.totalYear1IncVat?.toLocaleString('en-GB')}
- Profit margin applied: ${quote.profitMarginPct}%
- Services included: ${[...new Set((quote.assetLines ?? []).map((a: any) => a.discipline))].join(', ') || 'N/A'}
- Annual adjustment: ${quote.annualAdjustmentPct}%

Based on your knowledge of UK FM market rates, SFG20 compliance costs, BIFM benchmarks, and industry pricing:
1. Is this price broadly competitive, expensive, or potentially underpriced for this type of contract in this region?
2. What are typical market rates for this type and size of FM contract in the UK?
3. Any red flags or areas where the pricing seems unusual?
4. Brief competitive intelligence (2-3 sentences on what competitors typically offer).
5. Any recommendations for the pricing team.

Be specific and quantitative where possible. Keep the response focused and practical for a pricing manager.`

  try {
    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      prompt,
    })

    return Response.json({ insights: result.text })
  } catch (err: any) {
    return Response.json({ error: err?.message ?? 'Failed to generate insights' }, { status: 500 })
  }
}
