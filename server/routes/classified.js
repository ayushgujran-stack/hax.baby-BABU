import { Router } from 'express';

const router = Router();

// GET /api/classified-files - Secret supply-chain investigation dossier
router.get('/', (req, res) => {
  return res.json({
    success: true,
    classification: 'TOP SECRET // FOR EXECUTIVE EYES ONLY',
    title: 'OFFICIAL SUPPLY-CHAIN INVESTIGATION',
    files: [
      {
        id: 'FILE 001',
        title: 'THE BLACK JACKET DEAL',
        details: 'Babu barters with a suspicious man in a black jacket.'
      },
      {
        id: 'FILE 002',
        title: 'FIVE-FINGER DISCOUNT',
        details: 'He just steals it.'
      },
      {
        id: 'FILE 003',
        title: 'OPERATION TOMMY',
        details: 'Tommy steals pacifiers from stores.'
      }
    ],
    finalStamp: 'YOU SAW NOTHING.',
    additionalNote: 'If Mom asks, you were never here.'
  });
});

export default router;
