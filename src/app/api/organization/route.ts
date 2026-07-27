import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/service-role'; 

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('organizations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in GET /api/organization:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : JSON.stringify(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { data, error } = await supabaseAdmin
            .from('organizations')
            .insert([body])
            .select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (error) {
        console.error("Error in POST /api/organization:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : JSON.stringify(error) },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        const { data, error } = await supabaseAdmin
            .from('organizations')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (error) {
        console.error("Error in PUT /api/organization:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : JSON.stringify(error) },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('organizations')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in DELETE /api/organization:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : JSON.stringify(error) },
            { status: 500 }
        );
    }
}
