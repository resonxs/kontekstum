'use client'

import { ArrowRight, EllipsisVertical, Sparkle, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import wordsData from './words.json'

// Типы
type WordsDB = Record<string, string[]>

type Guess = {
	word: string
	rank: number
}

// Приведение JSON к типу с утверждением
const WORDS_DB = wordsData as WordsDB

const normalizeWord = (word: string): string => {
	return word.toLowerCase().replace(/ё/g, 'е')
}

const isRussianWord = (word: string): boolean => {
	const russianRegex = /^[а-яё-]+$/i
	return russianRegex.test(word)
}

const hasVowel = (word: string): boolean => {
	const vowels = /[аеёиоуыэюя]/i
	return vowels.test(word)
}

const hasConsonant = (word: string): boolean => {
	const consonants = /[бвгджзйклмнпрстфхцчшщ]/i
	return consonants.test(word)
}

const isPossibleRussianWord = (word: string): boolean => {
	if (word.length < 2) return false
	if (!hasVowel(word)) return false
	if (word.length > 1 && !hasConsonant(word)) return false

	const maxRepeat = 3
	let repeatCount = 1
	for (let i = 1; i < word.length; i++) {
		if (word[i] === word[i - 1]) {
			repeatCount++
			if (repeatCount > maxRepeat) return false
		} else {
			repeatCount = 1
		}
	}

	const commonWords = [
		'нет',
		'да',
		'и',
		'в',
		'на',
		'с',
		'к',
		'у',
		'о',
		'за',
		'по',
		'из',
		'от',
		'до'
	]
	if (commonWords.includes(word) && word.length <= 2) return true

	const rareCombos = /[ьъ][ьъ]|[ыы]|[ьъ][а-я]?[ьъ]|^[ьъ]|[й][й]/
	if (rareCombos.test(word)) return false

	return true
}

const getAllValidWords = (): Set<string> => {
	const validWords = new Set<string>()
	const entries = Object.entries(WORDS_DB) as [string, string[]][]

	for (const [word, similars] of entries) {
		validWords.add(normalizeWord(word))
		for (const similar of similars) {
			validWords.add(normalizeWord(similar))
		}
	}

	return validWords
}

const VALID_WORDS: Set<string> = getAllValidWords()

const getRandomSecretWord = (): string => {
	const words = Object.keys(WORDS_DB)
	const randomIndex = Math.floor(Math.random() * words.length)
	return normalizeWord(words[randomIndex])
}

const getWordRank = (secretWord: string, guess: string): number | null => {
	const entry = Object.entries(WORDS_DB).find(
		([key]) => normalizeWord(key) === secretWord
	)

	if (!entry) return null

	const [originalSecretWord, similarWords] = entry

	if (guess === secretWord) return 1

	const index = similarWords.findIndex(word => normalizeWord(word) === guess)
	if (index === -1) return null

	return index + 2
}

const isWordValid = (word: string): boolean => {
	return VALID_WORDS.has(normalizeWord(word))
}

export default function Home() {
	const [secretWord, setSecretWord] = useState<string>(() =>
		getRandomSecretWord()
	)
	const [inputValue, setInputValue] = useState<string>('')
	const [guesses, setGuesses] = useState<Guess[]>([])
	const [gameWon, setGameWon] = useState<boolean>(false)
	const [message, setMessage] = useState<string>('')
	const [errorMessage, setErrorMessage] = useState<string>('')
	const [hintIndex, setHintIndex] = useState<number | null>(null)
	const [showInfo, setShowInfo] = useState<boolean>(false)
	const [animateGuess, setAnimateGuess] = useState<number | null>(null)

	const startNewGame = (): void => {
		const newWord = getRandomSecretWord()
		setSecretWord(newWord)
		setGuesses([])
		setGameWon(false)
		setMessage('')
		setErrorMessage('')
		setInputValue('')
		setHintIndex(null)
	}

	const addGuess = (word: string, rank: number): void => {
		setGuesses(prev => {
			const existing = prev.find(g => g.word === normalizeWord(word))
			if (existing) return prev
			const newGuesses = [...prev, { word: normalizeWord(word), rank }]
			return newGuesses.sort((a, b) => a.rank - b.rank)
		})
		setAnimateGuess(rank)
		setTimeout(() => setAnimateGuess(null), 500)
	}

	const getHint = (): void => {
		if (gameWon) {
			setErrorMessage('игра уже завершена, начните новую')
			return
		}

		const entry = Object.entries(WORDS_DB).find(
			([key]) => normalizeWord(key) === secretWord
		)

		if (!entry) return

		const [originalSecretWord, similarWords] = entry

		if (!similarWords || similarWords.length === 0) {
			setErrorMessage('нет подсказок для этого слова')
			return
		}

		let nextIndex: number =
			hintIndex === null ? similarWords.length - 1 : hintIndex - 1

		if (nextIndex < 0) {
			setMessage(
				`подсказки закончились! загаданное слово "${secretWord}" (ранг 1)`
			)
			addGuess(secretWord, 1)
			setGameWon(true)
			return
		}

		const hintWord: string = similarWords[nextIndex]
		const hintRank: number = nextIndex + 2

		setHintIndex(nextIndex)
		setMessage(`подсказка: "${hintWord}" (ранг ${hintRank})`)
		addGuess(hintWord, hintRank)
	}

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
		e.preventDefault()
		setErrorMessage('')
		setMessage('')

		if (!inputValue.trim()) return
		if (gameWon) {
			setMessage('игра уже завершена, нажмите "новая игра"')
			return
		}

		const guessRaw: string = inputValue.trim().toLowerCase()

		if (!isRussianWord(guessRaw)) {
			setErrorMessage(`"${guessRaw}" — используйте только русские буквы`)
			return
		}

		if (!isPossibleRussianWord(guessRaw)) {
			setErrorMessage(`"${guessRaw}" — не является осмысленным русским словом`)
			return
		}

		const guess: string = normalizeWord(guessRaw)

		const alreadyGuessed: boolean = guesses.some(g => g.word === guess)
		if (alreadyGuessed) {
			setErrorMessage(`"${guess}" — вы уже вводили это слово`)
			return
		}

		if (guess === secretWord) {
			setGameWon(true)
			setMessage(`поздравляю! вы угадали слово "${secretWord}"!`)
			addGuess(guess, 1)
			setInputValue('')
			return
		}

		if (!isWordValid(guess)) {
			setErrorMessage(`"${guess}" — нет в словаре, попробуйте другое слово`)
			return
		}

		const rank: number | null = getWordRank(secretWord, guess)

		if (rank === null) {
			const randomRank: number = Math.floor(Math.random() * 700) + 300
			addGuess(guess, randomRank)
			setMessage(`"${guess}" — ранг ${randomRank}`)
		} else {
			addGuess(guess, rank)
			setMessage(`"${guess}" — ранг ${rank}`)
		}

		setInputValue('')
	}

	const getRankColor = (rank: number): string => {
		if (rank === 1) return 'text-accent'
		if (rank <= 5) return 'text-blue-400'
		if (rank <= 15) return 'text-text-secondary'
		return 'text-text-muted'
	}

	return (
		<div className="min-h-screen max-w-lg mx-auto px-4 py-6 flex flex-col">
			<header className="flex items-center justify-between flex-shrink-0 animate-slide-in">
				<Link
					href="/"
					className="text-2xl font-bold text-text-primary hover:text-accent transition-colors duration-300"
				>
					контекстум
				</Link>

				<div className="flex gap-2">
					<button
						onClick={startNewGame}
						className="px-4 py-2.5 rounded-xl bg-surface-elevated hover:bg-surface-elevated-hover transition-all duration-300 text-sm text-text-secondary hover-scale"
					>
						новая игра
					</button>
					<button
						onClick={() => setShowInfo(true)}
						className="p-2.5 rounded-xl bg-surface-elevated hover:bg-surface-elevated-hover transition-all duration-300 flex items-center justify-center hover-scale"
					>
						<EllipsisVertical
							size={20}
							className="text-text-primary"
						/>
					</button>
				</div>
			</header>

			{message && (
				<div className="mt-4 p-3 rounded-xl bg-surface-elevated text-center text-sm text-text-secondary animate-slide-in">
					{message}
				</div>
			)}

			{errorMessage && (
				<div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center text-sm text-red-400 animate-shake">
					{errorMessage}
				</div>
			)}

			<div className="mt-8 flex justify-center flex-shrink-0">
				<button
					onClick={getHint}
					disabled={gameWon}
					className="flex items-center justify-center gap-2 group transition-all duration-300 hover-scale disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<div className="p-3 rounded-xl bg-surface-elevated group-hover:bg-surface-elevated-hover transition-all duration-300 group-hover:shadow-lg">
						<Sparkle
							size={16}
							className="text-yellow-500 transition-all duration-300 group-hover:rotate-12"
						/>
					</div>
					<span className="text-text-secondary/50 group-hover:text-text-secondary/80 text-sm transition-all duration-300">
						подсказка
					</span>
				</button>
			</div>

			<form
				onSubmit={handleSubmit}
				className="mt-6 flex gap-2 flex-shrink-0"
			>
				<input
					type="text"
					value={inputValue}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setInputValue(e.target.value)
					}
					placeholder="введите слово"
					className="flex-1 bg-surface border border-border rounded-xl px-5 py-3.5 text-text-primary placeholder-text-secondary text-base focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50 transition-all duration-300 hover:border-accent/50"
					autoComplete="off"
				/>
				<button
					type="submit"
					disabled={!inputValue.trim() || gameWon}
					className="p-4 rounded-xl bg-surface-elevated hover:bg-surface-elevated-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center hover-scale disabled:hover:scale-100"
				>
					<ArrowRight
						size={20}
						className="text-text-primary transition-transform duration-300 group-hover:translate-x-1"
					/>
				</button>
			</form>

			<div className="mt-8 flex-1 min-h-0">
				<div className="h-full overflow-y-auto space-y-2 pr-1 custom-scroll">
					<div className="flex text-xs text-text-secondary px-3 pb-2 border-b border-surface-elevated sticky top-0 bg-background/95 backdrop-blur-sm z-10">
						<span className="w-12">ранг</span>
						<span>слово</span>
					</div>

					{guesses.map((guess: Guess, index: number) => (
						<div
							key={index}
							className={`bg-surface rounded-xl p-3 flex items-center hover:bg-surface-hover transition-all duration-300 hover-lift cursor-pointer ${
								animateGuess === guess.rank
									? 'animate-pulse-custom animate-glow'
									: ''
							}`}
							style={{
								animationDelay: `${index * 50}ms`,
								animation: `slideIn 0.3s ease-out forwards ${index * 50}ms`
							}}
						>
							<span
								className={`${getRankColor(guess.rank)} font-mono text-sm font-bold w-12 transition-all duration-300`}
							>
								#{guess.rank}
							</span>
							<span className="text-text-primary font-medium flex-1 ml-3">
								{guess.word}
							</span>
						</div>
					))}
				</div>
			</div>

			<div className="mt-8 text-center text-xs text-text-muted border-t border-surface-elevated pt-6 flex-shrink-0">
				<p>
					чем{' '}
					<span className="text-accent font-bold transition-all duration-300 hover:text-accent/80">
						меньше ранг
					</span>{' '}
					— тем ближе слово к загаданному
				</p>
			</div>

			{showInfo && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
					<div className="bg-surface rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl animate-slide-in">
						<div className="flex items-center justify-between p-6 border-b border-surface-elevated">
							<h2 className="text-xl font-bold text-text-primary">
								как играть?
							</h2>
							<button
								onClick={() => setShowInfo(false)}
								className="p-1 rounded-lg hover:bg-surface-elevated transition-all duration-300 hover-scale"
							>
								<X
									size={20}
									className="text-text-secondary"
								/>
							</button>
						</div>
						<div
							className="p-6 overflow-y-auto custom-scroll"
							style={{ maxHeight: 'calc(80vh - 80px)' }}
						>
							<div className="space-y-4">
								<div className="animate-slide-in">
									<h3 className="text-accent font-bold mb-2 text-lg">
										цель игры
									</h3>
									<p className="text-text-secondary text-sm leading-relaxed">
										угадать загаданное слово, вводя слова-ассоциации.
									</p>
								</div>

								<div
									className="animate-slide-in"
									style={{ animationDelay: '50ms' }}
								>
									<h3 className="text-accent font-bold mb-2 text-lg">
										как это работает
									</h3>
									<p className="text-text-secondary text-sm leading-relaxed">
										каждое слово имеет свой{' '}
										<span className="text-accent font-bold">ранг</span> — чем он
										меньше, тем ближе слово к загаданному. ранг 1 — загаданное
										слово
										<br />
										ранг 2 — самое близкое слово-ассоциация
										<br />
										ранг 3 и выше — менее очевидные ассоциации
									</p>
								</div>

								<div
									className="animate-slide-in"
									style={{ animationDelay: '100ms' }}
								>
									<h3 className="text-accent font-bold mb-2 text-lg">
										что можно делать
									</h3>
									<ul className="text-text-secondary text-sm leading-relaxed space-y-2">
										<li className="flex items-start gap-2">
											<span className="text-accent">•</span>
											<span>вводить только осмысленные русские слова</span>
										</li>
										<li className="flex items-start gap-2">
											<span className="text-accent">•</span>
											<span>нельзя вводить одно и то же слово дважды</span>
										</li>
										<li className="flex items-start gap-2">
											<span className="text-accent">•</span>
											<span>
												если слова нет в словаре — получишь случайный ранг от
												300 до 999
											</span>
										</li>
										<li className="flex items-start gap-2">
											<span className="text-accent">•</span>
											<span>
												использовать подсказку — она покажет слово с самым
												высоким рангом
											</span>
										</li>
										<li className="flex items-start gap-2">
											<span className="text-accent">•</span>
											<span>
												нажимать подсказку несколько раз — каждое следующее
												слово будет ближе к загаданному
											</span>
										</li>
										<li className="flex items-start gap-2">
											<span className="text-accent">•</span>
											<span>
												когда подсказки закончатся — слово автоматически
												отгадается
											</span>
										</li>
										<li className="flex items-start gap-2">
											<span className="text-accent">•</span>
											<span>начинать новую игру в любой момент</span>
										</li>
									</ul>
								</div>

								<div
									className="animate-slide-in"
									style={{ animationDelay: '150ms' }}
								>
									<h3 className="text-accent font-bold mb-2 text-lg">пример</h3>
									<p className="text-text-secondary text-sm leading-relaxed">
										если загадано слово &quot;атака&quot;, то:
										<br />
										ранг 1 — &quot;атака&quot; (загаданное слово)
										<br />
										ранг 2 — &quot;нападение&quot; (самое очевидное)
										<br />
										ранг 3 и выше — другие ассоциации
									</p>
								</div>

								<div
									className="animate-slide-in"
									style={{ animationDelay: '200ms' }}
								>
									<h3 className="text-accent font-bold mb-2 text-lg">
										важные правила
									</h3>
									<ul className="text-text-secondary text-sm leading-relaxed space-y-2">
										<li className="flex items-start gap-2">
											<span className="text-accent">•</span>
											<span>только осмысленные русские слова</span>
										</li>
										<li className="flex items-start gap-2">
											<span className="text-accent">•</span>
											<span>
												бессмыслица вроде &quot;ыфлвофлвы&quot; не принимается
											</span>
										</li>
										<li className="flex items-start gap-2">
											<span className="text-accent">•</span>
											<span>одно слово можно ввести только один раз</span>
										</li>
									</ul>
								</div>

								<button
									onClick={() => setShowInfo(false)}
									className="w-full mt-6 px-4 py-2.5 rounded-xl bg-accent text-white font-medium hover:opacity-90 transition-all duration-300 hover-scale"
								>
									понятно!
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
