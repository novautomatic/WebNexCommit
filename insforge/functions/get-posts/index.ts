export default async (req: any) => {
  console.log('Function called');
  
  return {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ id: 1, title: 'Test' }]),
  };
};
