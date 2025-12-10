import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting notifications backfill...');

    // 1. Backfill accepted quotes (quote_signed)
    const { data: acceptedQuotes } = await supabaseClient
      .from('devis')
      .select('id, numero, client_nom, accepted_at, signature_date')
      .in('statut', ['Accepté', 'Signé'])
      .not('accepted_at', 'is', null);

    if (acceptedQuotes && acceptedQuotes.length > 0) {
      for (const quote of acceptedQuotes) {
        await supabaseClient.from('notifications').insert({
          kind: 'quote_signed',
          type: 'quote_signed',
          title: 'Devis signé',
          message: `Le devis ${quote.numero} pour ${quote.client_nom} a été accepté`,
          link: `/devis/${quote.id}`,
          created_at: quote.accepted_at || quote.signature_date,
          read_at: new Date().toISOString(), // Mark historical as read
        });
      }
      console.log(`Created ${acceptedQuotes.length} quote_signed notifications`);
    }

    // 2. Backfill invoices to send
    const { data: invoicesToSend } = await supabaseClient
      .from('factures')
      .select('id, numero, client_nom, created_at')
      .is('sent_at', null)
      .is('paid_at', null);

    if (invoicesToSend && invoicesToSend.length > 0) {
      for (const invoice of invoicesToSend) {
        await supabaseClient.from('notifications').insert({
          kind: 'invoice_to_send',
          type: 'invoice_to_send',
          title: 'Facture à envoyer',
          message: `La facture ${invoice.numero} pour ${invoice.client_nom} est prête à être envoyée`,
          link: `/factures/${invoice.id}`,
          created_at: invoice.created_at,
          read_at: new Date().toISOString(),
        });
      }
      console.log(`Created ${invoicesToSend.length} invoice_to_send notifications`);
    }

    // 3. Backfill overdue invoices
    const { data: overdueInvoices } = await supabaseClient
      .from('factures')
      .select('id, numero, client_nom, due_date')
      .not('sent_at', 'is', null)
      .is('paid_at', null)
      .lt('due_date', new Date().toISOString());

    if (overdueInvoices && overdueInvoices.length > 0) {
      for (const invoice of overdueInvoices) {
        await supabaseClient.from('notifications').insert({
          kind: 'invoice_overdue',
          type: 'invoice_overdue',
          title: 'Facture en retard',
          message: `La facture ${invoice.numero} pour ${invoice.client_nom} est en retard`,
          link: `/factures/${invoice.id}`,
          created_at: invoice.due_date,
          read_at: new Date().toISOString(),
        });
      }
      console.log(`Created ${overdueInvoices.length} invoice_overdue notifications`);
    }

    // 4. Backfill job assignments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: assignments } = await supabaseClient
      .from('intervention_assignments')
      .select('intervention_id, employee_id, created_at, jobs(titre)')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        const job = assignment.jobs as any;
        await supabaseClient.from('notifications').insert({
          kind: 'job_assigned',
          type: 'job_assigned',
          title: 'Nouvelle intervention assignée',
          message: `Une intervention a été assignée: ${job?.titre || 'Sans titre'}`,
          link: `/interventions/${assignment.intervention_id}`,
          created_at: assignment.created_at,
          read: true,
        });
      }
      console.log(`Created ${assignments.length} job_assigned notifications`);
    }

    // 5. Backfill agenda events (upcoming reminders)
    const { data: agendaEvents } = await supabaseClient
      .from('agenda_events')
      .select('*')
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(100);

    if (agendaEvents && agendaEvents.length > 0) {
      for (const event of agendaEvents) {
        const eventDate = new Date(event.start_at);
        
        // Create J-1 reminder at 09:00
        const reminderJ1 = new Date(eventDate);
        reminderJ1.setDate(reminderJ1.getDate() - 1);
        reminderJ1.setHours(9, 0, 0, 0);

        if (reminderJ1 > new Date()) {
          await supabaseClient.from('notifications').insert({
            kind: 'agenda_reminder',
            type: 'agenda_reminder',
            title: 'Rappel agenda',
            message: `Rappel: ${event.title} demain à ${eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
            link: `/agenda/${event.id}`,
            created_at: reminderJ1.toISOString(),
            read_at: null,
          });
        }

        // Create J-15min reminder
        const reminder15min = new Date(eventDate);
        reminder15min.setMinutes(reminder15min.getMinutes() - 15);

        if (reminder15min > new Date()) {
          await supabaseClient.from('notifications').insert({
            kind: 'agenda_reminder',
            type: 'agenda_reminder',
            title: 'Rappel agenda',
            message: `Dans 15 minutes: ${event.title}`,
            link: `/agenda/${event.id}`,
            created_at: reminder15min.toISOString(),
            read_at: null,
          });
        }
      }
      console.log(`Created agenda reminders for ${agendaEvents.length} events`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notifications backfill completed successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error during backfill:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
