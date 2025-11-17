import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Updating agenda event statuses...');

    // Get current timestamp
    const now = new Date().toISOString();

    // Update events that have passed their end_at date to "terminé"
    const { data: updatedEvents, error } = await supabase
      .from('agenda_events')
      .update({ status: 'terminé' })
      .lt('end_at', now)
      .in('status', ['à venir', 'aujourd\'hui'])
      .select();

    if (error) {
      console.error('Error updating agenda events:', error);
      throw error;
    }

    console.log(`Updated ${updatedEvents?.length || 0} agenda events to "terminé"`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedEvents?.length || 0,
        message: `${updatedEvents?.length || 0} événements mis à jour`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});