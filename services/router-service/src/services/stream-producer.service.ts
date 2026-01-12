export async function publishToChannel(stream: string, payload: any) {
  // Publish to downstream streams (email/sms)
  console.debug('publishToChannel', stream, payload);
}
