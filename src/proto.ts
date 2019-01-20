export type PlayStateTiming =
{ state: 'playing'; effectiveStartTimeMillis: number; } |
{ state: 'paused'; positionMillis: number; };

export interface PlayState {
    /** Song length in milliseconds */
    length: number;
    title: string;
    artist?: string;
    album?: string;
    state: PlayStateTiming;
}

export type TabMessage = {
    msg: 'update_state';
    state: PlayState | null;
};
