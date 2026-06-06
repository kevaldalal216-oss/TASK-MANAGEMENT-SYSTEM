const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, text, html } = await req.json()
    if (!to || !subject || (!text && !html)) {
      return json({ error: 'Missing to, subject, and message body.' }, 400)
    }

    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY')
    const fromEmail = Deno.env.get('TASK_EMAIL_FROM')

    if (!sendGridApiKey || !fromEmail) {
      return json({ error: 'Email service is not configured.' }, 500)
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail },
        subject,
        content: [
          ...(text ? [{ type: 'text/plain', value: text }] : []),
          ...(html ? [{ type: 'text/html', value: html }] : []),
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return json({ error: errorText || 'SendGrid request failed.' }, 502)
    }

    return json({ ok: true })
  } catch (error) {
    return json({ error: error.message ?? 'Unable to send email.' }, 500)
  }
})

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
