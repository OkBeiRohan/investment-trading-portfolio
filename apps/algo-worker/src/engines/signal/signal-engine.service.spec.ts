/**/**

 * SignalEngineService Unit Tests * SignalEngineService Unit Tests

 * Tests the ensemble ML inference logic with mocked dependencies * Tests the ensemble ML inference logic with mocked dependencies

 */ */



import { Test, TestingModule } from '@nestjs/testing';import { Test, TestingModule } from '@nestjs/testing';

import { SignalEngineService } from './signal-engine.service';import { SignalEngineService } from './signal-engine.service';

import { PythonInferenceService } from './python-inference.service';import { PythonInferenceService } from './python-inference.service';

import { SignalRepository } from '../../persistence/repositories/signal.repository';import { SignalRepository } from '../../persistence/repositories/signal.repository';



describe('SignalEngineService', () => {interface PredictionResult {

  let service: SignalEngineService;  prediction: number;

  let pythonInferenceService: PythonInferenceService;  probability: number;

  let signalRepository: SignalRepository;  probabilities: [number, number];

}

  // Test features fixture

  const testFeatures = {describe('SignalEngineService', () => {

    realizedVol5d: 0.22,  let service: SignalEngineService;

    realizedVol10d: 0.2,  let pythonInferenceService: jest.Mocked<PythonInferenceService>;

    realizedVol20d: 0.18,  let signalRepository: jest.Mocked<SignalRepository>;

    rsi14: 65,

    macdValue: 1.5,  // Test features fixture

    macdSignal: 1.2,  const testFeatures = {

    macdHistogram: 0.3,    realizedVol5d: 0.22,

    sma20: 19500,    realizedVol10d: 0.2,

    sma50: 19200,    realizedVol20d: 0.18,

    ema12: 19600,    rsi14: 65,

    ema26: 19300,    macdValue: 1.5,

    indiaVix: 18.5,    macdSignal: 1.2,

    indiaVixMA5: 17.2,    macdHistogram: 0.3,

    pcrVolume: 1.15,    sma20: 19500,

    pcrOI: 1.2,    sma50: 19200,

    maxPain: 19500,    ema12: 19600,

    atmIV: 20.5,    ema26: 19300,

    volSkew: 2.1,    indiaVix: 18.5,

    termStructure: 1.05,    indiaVixMA5: 17.2,

    callIVSpread: 2.5,    pcrVolume: 1.15,

    putIVSpread: 3.0,    pcrOI: 1.2,

    hour: 11,    maxPain: 19500,

    dayOfWeek: 3,    atmIV: 20.5,

    isMarketOpen: 1,    volSkew: 2.1,

  };    termStructure: 1.05,

    callIVSpread: 2.5,

  beforeEach(async () => {    putIVSpread: 3.0,

    const module: TestingModule = await Test.createTestingModule({    hour: 11,

      providers: [    dayOfWeek: 3,

        SignalEngineService,    isMarketOpen: 1,

        {  };

          provide: PythonInferenceService,

          useValue: {  beforeEach(async () => {

            runInference: jest.fn(),    // Create mock implementations

          },    const mockPythonInferenceService = {

        },      runInference: jest.fn(),

        {      getModelMetadata: jest.fn(),

          provide: SignalRepository,      isModelLoaded: jest.fn(),

          useValue: {      getAvailableModels: jest.fn(),

            create: jest.fn(),    };

            findById: jest.fn(),

          },    const mockSignalRepository = {

        },      create: jest.fn(),

      ],      findById: jest.fn(),

    }).compile();      findRecent: jest.fn(),

      getPerformanceStats: jest.fn(),

    service = module.get<SignalEngineService>(SignalEngineService);    };

    pythonInferenceService = module.get<PythonInferenceService>(

      PythonInferenceService,    const module: TestingModule = await Test.createTestingModule({

    );      providers: [

    signalRepository = module.get<SignalRepository>(SignalRepository);        SignalEngineService,

  });        {

          provide: PythonInferenceService,

  afterEach(() => {          useValue: mockPythonInferenceService,

    jest.clearAllMocks();        },

  });        {

          provide: SignalRepository,

  describe('generateSignal', () => {          useValue: mockSignalRepository,

    it('should be defined', () => {        },

      expect(service).toBeDefined();      ],

    });    }).compile();



    it('should generate VOL_UP signal when probability > 0.55', async () => {    service = module.get<SignalEngineService>(SignalEngineService);

      // Mock high VOL_UP prediction    pythonInferenceService = module.get(

      jest      PythonInferenceService,

        .spyOn(pythonInferenceService, 'runInference')    ) as jest.Mocked<PythonInferenceService>;

        .mockResolvedValueOnce({    signalRepository = module.get(SignalRepository) as jest.Mocked<SignalRepository>;

          prediction: 1,  });

          probability: 0.75,

          probabilities: [0.25, 0.75],  afterEach(() => {

        })    jest.clearAllMocks();

        .mockResolvedValueOnce({  });

          prediction: 1,

          probability: 0.72,  describe('generateSignal', () => {

          probabilities: [0.28, 0.72],    it('should be defined', () => {

        });      expect(service).toBeDefined();

    });

      const signal = await service.generateSignal(testFeatures, 'test-user');

    it('should generate VOL_UP signal when probability > 0.55', async () => {

      expect(signal.prediction).toBe('VOL_UP');      // Mock high VOL_UP prediction

      expect(signal.confidence).toBeGreaterThan(0.55);      const mockXGBoostPrediction: ModelPrediction = {

      expect(signal.probability).toBeCloseTo(0.735, 2); // Average of 0.75 and 0.72        prediction: 1,

      expect(signal.userId).toBe('test-user');        probability: 0.75,

      expect(signal.timestamp).toBeInstanceOf(Date);        probabilities: [0.25, 0.75],

    });      };



    it('should generate VOL_DOWN signal when probability < 0.45', async () => {      const mockSVMPrediction: ModelPrediction = {

      // Mock low VOL_DOWN prediction (high probability of class 0)        prediction: 1,

      jest        probability: 0.72,

        .spyOn(pythonInferenceService, 'runInference')        probabilities: [0.28, 0.72],

        .mockResolvedValueOnce({      };

          prediction: 0,

          probability: 0.25,      pythonInferenceService.predict

          probabilities: [0.75, 0.25],        .mockResolvedValueOnce(mockXGBoostPrediction) // XGBoost

        })        .mockResolvedValueOnce(mockSVMPrediction); // SVM

        .mockResolvedValueOnce({

          prediction: 0,      const signal = await service.generateSignal(testFeatures, 'test-user');

          probability: 0.3,

          probabilities: [0.7, 0.3],      expect(signal.prediction).toBe('VOL_UP');

        });      expect(signal.confidence).toBeGreaterThan(0.55);

      expect(signal.probability).toBeCloseTo(0.735, 2); // Average of 0.75 and 0.72

      const signal = await service.generateSignal(testFeatures, 'test-user');      expect(signal.userId).toBe('test-user');

      expect(signal.timestamp).toBeInstanceOf(Date);

      expect(signal.prediction).toBe('VOL_DOWN');    });

      expect(signal.confidence).toBeGreaterThan(0.5);

      expect(signal.probability).toBeCloseTo(0.275, 2); // Average of 0.25 and 0.30    it('should generate VOL_DOWN signal when probability < 0.45', async () => {

    });      // Mock low VOL_DOWN prediction (high probability of class 0)

      const mockXGBoostPrediction: ModelPrediction = {

    it('should generate NEUTRAL signal when probability is between 0.45 and 0.55', async () => {        prediction: 0,

      // Mock neutral prediction        probability: 0.25,

      jest        probabilities: [0.75, 0.25],

        .spyOn(pythonInferenceService, 'runInference')      };

        .mockResolvedValueOnce({

          prediction: 1,      const mockSVMPrediction: ModelPrediction = {

          probability: 0.52,        prediction: 0,

          probabilities: [0.48, 0.52],        probability: 0.3,

        })        probabilities: [0.7, 0.3],

        .mockResolvedValueOnce({      };

          prediction: 0,

          probability: 0.48,      (pythonInferenceService.predict as jest.Mock)

          probabilities: [0.52, 0.48],        .mockResolvedValueOnce(mockXGBoostPrediction)

        });        .mockResolvedValueOnce(mockSVMPrediction);



      const signal = await service.generateSignal(testFeatures, 'test-user');      const signal = await service.generateSignal(testFeatures, 'test-user');



      expect(signal.prediction).toBe('NEUTRAL');      expect(signal.prediction).toBe('VOL_DOWN');

      expect(signal.probability).toBeCloseTo(0.5, 1);      expect(signal.confidence).toBeGreaterThan(0.5);

    });      expect(signal.probability).toBeCloseTo(0.275, 2); // Average of 0.25 and 0.30

    });

    it('should include model contributions', async () => {

      jest    it('should generate NEUTRAL signal when probability is between 0.45 and 0.55', async () => {

        .spyOn(pythonInferenceService, 'runInference')      // Mock neutral prediction

        .mockResolvedValueOnce({      const mockXGBoostPrediction: ModelPrediction = {

          prediction: 1,        prediction: 1,

          probability: 0.68,        probability: 0.52,

          probabilities: [0.32, 0.68],        probabilities: [0.48, 0.52],

        })      };

        .mockResolvedValueOnce({

          prediction: 1,      const mockSVMPrediction: ModelPrediction = {

          probability: 0.65,        prediction: 0,

          probabilities: [0.35, 0.65],        probability: 0.48,

        });        probabilities: [0.52, 0.48],

      };

      const signal = await service.generateSignal(testFeatures, 'test-user');

      pythonInferenceService.predict

      expect(signal.modelContributions).toBeDefined();        .mockResolvedValueOnce(mockXGBoostPrediction)

      expect(signal.modelContributions.xgboost).toBe(0.68);        .mockResolvedValueOnce(mockSVMPrediction);

      expect(signal.modelContributions.svm).toBe(0.65);

      expect(signal.modelContributions.cnnLstm).toBe(0.5);      const signal = await service.generateSignal(testFeatures, 'test-user');

      expect(signal.modelContributions.ginn).toBe(0.5);

    });      expect(signal.prediction).toBe('NEUTRAL');

      expect(signal.probability).toBeCloseTo(0.5, 1);

    it('should include metadata with latency and model versions', async () => {    });

      jest.spyOn(pythonInferenceService, 'runInference').mockResolvedValue({

        prediction: 1,    it('should include model contributions', async () => {

        probability: 0.7,      const mockXGBoostPrediction: ModelPrediction = {

        probabilities: [0.3, 0.7],        prediction: 1,

      });        probability: 0.68,

        probabilities: [0.32, 0.68],

      const signal = await service.generateSignal(testFeatures, 'test-user');      };



      expect(signal.metadata).toBeDefined();      const mockSVMPrediction: ModelPrediction = {

      expect(signal.metadata?.latencyMs).toBeDefined();        prediction: 1,

      expect(signal.metadata?.latencyMs).toBeGreaterThanOrEqual(0);        probability: 0.65,

      expect(signal.metadata?.modelVersions).toBeDefined();        probabilities: [0.35, 0.65],

      expect(signal.metadata?.modelVersions.xgboost).toBe('1.0.0');      };

      expect(signal.metadata?.modelVersions.svm).toBe('1.0.0');

    });      pythonInferenceService.predict

        .mockResolvedValueOnce(mockXGBoostPrediction)

    it('should call runInference twice (XGBoost and SVM)', async () => {        .mockResolvedValueOnce(mockSVMPrediction);

      const runInferenceSpy = jest

        .spyOn(pythonInferenceService, 'runInference')      const signal = await service.generateSignal(testFeatures, 'test-user');

        .mockResolvedValue({

          prediction: 1,      expect(signal.modelContributions).toBeDefined();

          probability: 0.7,      expect(signal.modelContributions.xgboost).toBe(0.68);

          probabilities: [0.3, 0.7],      expect(signal.modelContributions.svm).toBe(0.65);

        });      expect(signal.modelContributions.cnnLstm).toBe(0.5);

      expect(signal.modelContributions.ginn).toBe(0.5);

      await service.generateSignal(testFeatures, 'test-user');    });



      expect(runInferenceSpy).toHaveBeenCalledTimes(2);    it('should include metadata with latency and model versions', async () => {

      expect(runInferenceSpy).toHaveBeenCalledWith('xgboost', testFeatures);      const mockPrediction: ModelPrediction = {

      expect(runInferenceSpy).toHaveBeenCalledWith('svm', testFeatures);        prediction: 1,

    });        probability: 0.7,

        probabilities: [0.3, 0.7],

    it('should handle Python inference errors gracefully', async () => {      };

      jest

        .spyOn(pythonInferenceService, 'runInference')      pythonInferenceService.predict

        .mockRejectedValue(new Error('Python process failed'));        .mockResolvedValueOnce(mockPrediction)

        .mockResolvedValueOnce(mockPrediction);

      await expect(

        service.generateSignal(testFeatures, 'test-user'),      const signal = await service.generateSignal(testFeatures, 'test-user');

      ).rejects.toThrow('Python process failed');

    });      expect(signal.metadata).toBeDefined();

  });      expect(signal.metadata?.latencyMs).toBeDefined();

      expect(signal.metadata?.latencyMs).toBeGreaterThanOrEqual(0);

  describe('generateAndPersistSignal', () => {      expect(signal.metadata?.modelVersions).toBeDefined();

    it('should generate signal and persist to MongoDB', async () => {      expect(signal.metadata?.modelVersions.xgboost).toBe('1.0.0');

      jest.spyOn(pythonInferenceService, 'runInference').mockResolvedValue({      expect(signal.metadata?.modelVersions.svm).toBe('1.0.0');

        prediction: 1,    });

        probability: 0.7,

        probabilities: [0.3, 0.7],    it('should include feature snapshot in signal', async () => {

      });      const mockPrediction: ModelPrediction = {

        prediction: 1,

      jest        probability: 0.7,

        .spyOn(signalRepository, 'create')        probabilities: [0.3, 0.7],

        .mockResolvedValue('mock-signal-id-123');      };



      const signalId = await service.generateAndPersistSignal(      pythonInferenceService.predict

        testFeatures,        .mockResolvedValueOnce(mockPrediction)

        'test-user',        .mockResolvedValueOnce(mockPrediction);

      );

      const signal = await service.generateSignal(testFeatures, 'test-user');

      expect(signalId).toBe('mock-signal-id-123');

      expect(signalRepository.create).toHaveBeenCalledTimes(1);      expect(signal.features).toBeDefined();

      expect(signalRepository.create).toHaveBeenCalledWith(      expect(signal.features).toEqual(testFeatures);

        expect.objectContaining({    });

          userId: 'test-user',

          prediction: expect.stringMatching(/^(VOL_UP|VOL_DOWN|NEUTRAL)$/),    it('should call PythonInferenceService twice (XGBoost and SVM)', async () => {

          confidence: expect.any(Number),      const mockPrediction: ModelPrediction = {

          probability: expect.any(Number),        prediction: 1,

        }),        probability: 0.7,

      );        probabilities: [0.3, 0.7],

    });      };



    it('should propagate errors from repository', async () => {      pythonInferenceService.predict.mockResolvedValue(mockPrediction);

      jest.spyOn(pythonInferenceService, 'runInference').mockResolvedValue({

        prediction: 1,      await service.generateSignal(testFeatures, 'test-user');

        probability: 0.7,

        probabilities: [0.3, 0.7],      expect(pythonInferenceService.predict).toHaveBeenCalledTimes(2);

      });      expect(pythonInferenceService.predict).toHaveBeenCalledWith(

        'xgboost',

      jest        expect.any(Array),

        .spyOn(signalRepository, 'create')      );

        .mockRejectedValue(new Error('MongoDB connection failed'));      expect(pythonInferenceService.predict).toHaveBeenCalledWith(

        'svm',

      await expect(        expect.any(Array),

        service.generateAndPersistSignal(testFeatures, 'test-user'),      );

      ).rejects.toThrow('MongoDB connection failed');    });

    });

  });    it('should handle Python inference errors gracefully', async () => {

      pythonInferenceService.predict.mockRejectedValue(

  describe('Ensemble Logic', () => {        new Error('Python process failed'),

    it('should weight models equally in ensemble', async () => {      );

      // XGBoost predicts 0.8, SVM predicts 0.6

      jest      await expect(

        .spyOn(pythonInferenceService, 'runInference')        service.generateSignal(testFeatures, 'test-user'),

        .mockResolvedValueOnce({      ).rejects.toThrow('Python process failed');

          prediction: 1,    });

          probability: 0.8,  });

          probabilities: [0.2, 0.8],

        })  describe('generateAndPersistSignal', () => {

        .mockResolvedValueOnce({    it('should generate signal and persist to MongoDB', async () => {

          prediction: 1,      const mockPrediction: ModelPrediction = {

          probability: 0.6,        prediction: 1,

          probabilities: [0.4, 0.6],        probability: 0.7,

        });        probabilities: [0.3, 0.7],

      };

      const signal = await service.generateSignal(testFeatures, 'test-user');

      pythonInferenceService.predict.mockResolvedValue(mockPrediction);

      // Ensemble should average: (0.8 + 0.6) / 2 = 0.7      signalRepository.create.mockResolvedValue('mock-signal-id-123');

      expect(signal.probability).toBeCloseTo(0.7, 2);

    });      const signalId = await service.generateAndPersistSignal(

        testFeatures,

    it('should handle disagreement between models', async () => {        'test-user',

      // XGBoost strongly predicts VOL_UP (0.9)      );

      // SVM strongly predicts VOL_DOWN (0.2)

      jest      expect(signalId).toBe('mock-signal-id-123');

        .spyOn(pythonInferenceService, 'runInference')      expect(signalRepository.create).toHaveBeenCalledTimes(1);

        .mockResolvedValueOnce({      expect(signalRepository.create).toHaveBeenCalledWith(

          prediction: 1,        expect.objectContaining({

          probability: 0.9,          userId: 'test-user',

          probabilities: [0.1, 0.9],          prediction: expect.stringMatching(/^(VOL_UP|VOL_DOWN|NEUTRAL)$/),

        })          confidence: expect.any(Number),

        .mockResolvedValueOnce({          probability: expect.any(Number),

          prediction: 0,        }),

          probability: 0.2,      );

          probabilities: [0.8, 0.2],    });

        });

    it('should propagate errors from repository', async () => {

      const signal = await service.generateSignal(testFeatures, 'test-user');      const mockPrediction: ModelPrediction = {

        prediction: 1,

      // Ensemble averages to neutral: (0.9 + 0.2) / 2 = 0.55        probability: 0.7,

      expect(signal.probability).toBeCloseTo(0.55, 2);        probabilities: [0.3, 0.7],

      expect(signal.prediction).toBe('VOL_UP'); // Just above 0.55 threshold      };

    });

  });      pythonInferenceService.predict.mockResolvedValue(mockPrediction);

      signalRepository.create.mockRejectedValue(

  describe('Confidence Calculation', () => {        new Error('MongoDB connection failed'),

    it('should calculate confidence as distance from neutral', async () => {      );

      jest.spyOn(pythonInferenceService, 'runInference').mockResolvedValue({

        prediction: 1,      await expect(

        probability: 0.85,        service.generateAndPersistSignal(testFeatures, 'test-user'),

        probabilities: [0.15, 0.85],      ).rejects.toThrow('MongoDB connection failed');

      });    });

  });

      const signal = await service.generateSignal(testFeatures, 'test-user');

  describe('Ensemble Logic', () => {

      // Confidence = |0.85 - 0.5| * 2 = 0.7    it('should weight models equally in ensemble', async () => {

      expect(signal.confidence).toBeCloseTo(0.7, 2);      // XGBoost predicts 0.8, SVM predicts 0.6

    });      const mockXGBoostPrediction: ModelPrediction = {

        prediction: 1,

    it('should have low confidence near neutral probability', async () => {        probability: 0.8,

      jest.spyOn(pythonInferenceService, 'runInference').mockResolvedValue({        probabilities: [0.2, 0.8],

        prediction: 1,      };

        probability: 0.51,

        probabilities: [0.49, 0.51],      const mockSVMPrediction: ModelPrediction = {

      });        prediction: 1,

        probability: 0.6,

      const signal = await service.generateSignal(testFeatures, 'test-user');        probabilities: [0.4, 0.6],

      };

      // Confidence = |0.51 - 0.5| * 2 = 0.02

      expect(signal.confidence).toBeLessThan(0.1);      pythonInferenceService.predict

    });        .mockResolvedValueOnce(mockXGBoostPrediction)

  });        .mockResolvedValueOnce(mockSVMPrediction);

});

      const signal = await service.generateSignal(testFeatures, 'test-user');

      // Ensemble should average: (0.8 + 0.6) / 2 = 0.7
      expect(signal.probability).toBeCloseTo(0.7, 2);
    });

    it('should handle disagreement between models', async () => {
      // XGBoost strongly predicts VOL_UP (0.9)
      // SVM strongly predicts VOL_DOWN (0.2)
      const mockXGBoostPrediction: ModelPrediction = {
        prediction: 1,
        probability: 0.9,
        probabilities: [0.1, 0.9],
      };

      const mockSVMPrediction: ModelPrediction = {
        prediction: 0,
        probability: 0.2,
        probabilities: [0.8, 0.2],
      };

      pythonInferenceService.predict
        .mockResolvedValueOnce(mockXGBoostPrediction)
        .mockResolvedValueOnce(mockSVMPrediction);

      const signal = await service.generateSignal(testFeatures, 'test-user');

      // Ensemble averages to neutral: (0.9 + 0.2) / 2 = 0.55
      expect(signal.probability).toBeCloseTo(0.55, 2);
      expect(signal.prediction).toBe('VOL_UP'); // Just above 0.55 threshold
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence as distance from neutral', async () => {
      const mockHighConfPrediction: ModelPrediction = {
        prediction: 1,
        probability: 0.85,
        probabilities: [0.15, 0.85],
      };

      pythonInferenceService.predict.mockResolvedValue(
        mockHighConfPrediction,
      );

      const signal = await service.generateSignal(testFeatures, 'test-user');

      // Confidence = |0.85 - 0.5| / 0.5 = 0.7
      expect(signal.confidence).toBeCloseTo(0.7, 2);
    });

    it('should have low confidence near neutral probability', async () => {
      const mockNeutralPrediction: ModelPrediction = {
        prediction: 1,
        probability: 0.51,
        probabilities: [0.49, 0.51],
      };

      pythonInferenceService.predict.mockResolvedValue(
        mockNeutralPrediction,
      );

      const signal = await service.generateSignal(testFeatures, 'test-user');

      // Confidence = |0.51 - 0.5| / 0.5 = 0.02
      expect(signal.confidence).toBeLessThan(0.1);
    });
  });
});
