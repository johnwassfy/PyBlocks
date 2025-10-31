'use client';

import { Code2, Sparkles, Trophy, Zap, Users, CheckCircle2, ArrowRight, Play, Star, Rocket, Heart } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

export default function Homepage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <Code2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-2xl text-gray-900">PyBlocks</div>
              <div className="text-xs text-gray-500">Learn Python, Have Fun!</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-indigo-600 transition-colors">Features</a>
            <a href="#how" className="text-gray-600 hover:text-indigo-600 transition-colors">How it Works</a>
            <a href="#safe" className="text-gray-600 hover:text-indigo-600 transition-colors">Parent Info</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="hidden sm:flex">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                Start Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full border-2 border-amber-200">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>Join 10,000+ young coders!</span>
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            
            <h1 className="text-5xl lg:text-6xl text-gray-900 leading-tight">
              Learn Python by Building Cool Stuff! 🚀
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed">
              Drag blocks, create games, and become a coding superstar! No typing needed to start.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/register">
                <Button 
                  size="lg" 
                  className="bg-indigo-600 hover:bg-indigo-700 h-14 px-8 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  Start Learning Free
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg"
                className="h-14 px-8 text-lg border-2 rounded-xl hover:bg-gray-50"
              >
                <Play className="w-5 h-5 mr-2" />
                Watch How It Works
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <span>100% Free Forever</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <span>Ages 8-15</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <span>Safe & Fun</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-indigo-100">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1565373086464-c8af0d586c0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGNoaWxkcmVuJTIwbGVhcm5pbmd8ZW58MXx8fHwxNzYxNDE5MTUyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Kids learning to code"
                className="w-full h-[500px] object-cover"
              />
            </div>
            
            {/* Floating Cards */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 border-2 border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl">500+</div>
                  <div className="text-sm text-gray-600">Fun Challenges</div>
                </div>
              </div>
            </div>
            
            <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-4 border-2 border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl">10k+</div>
                  <div className="text-sm text-gray-600">Happy Kids</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4" />
              <span>What Makes PyBlocks Special</span>
            </div>
            <h2 className="text-4xl mb-4 text-gray-900">Everything You Need to Become a Coding Pro!</h2>
            <p className="text-xl text-gray-600">
              Learn, build, and have fun - all in one place
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-blue-100 hover:border-blue-300 transition-all hover:shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-md">
                <Code2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl mb-3 text-gray-900">Drag & Drop Blocks</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                No typing needed! Just drag colorful blocks to build your code. It's like playing with LEGO!
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <span>Super easy to start</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <span>See real Python code</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <span>Build games & animations</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-purple-100 hover:border-purple-300 transition-all hover:shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-md">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl mb-3 text-gray-900">AI Helper Friend 🤖</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Stuck? Our smart AI tutor is here 24/7 to help! It's like having a coding buddy who never gets tired.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                  <span>Get hints when stuck</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                  <span>Learn at your pace</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                  <span>Friendly explanations</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-amber-100 hover:border-amber-300 transition-all hover:shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-md">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl mb-3 text-gray-900">Earn Cool Badges! 🏆</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Complete missions, unlock achievements, and show off your coding skills with awesome badges!
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  <span>50+ badges to collect</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  <span>Track your progress</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  <span>Compete with friends</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl mb-4 text-gray-900">How PyBlocks Works</h2>
            <p className="text-xl text-gray-600">
              Get started in just 3 easy steps!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg">
                1
              </div>
              <h3 className="text-xl mb-3 text-gray-900">Pick Your Avatar</h3>
              <p className="text-gray-600">
                Choose a cool avatar and create your coder nickname. No real names needed - stay safe!
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg">
                2
              </div>
              <h3 className="text-xl mb-3 text-gray-900">Start Your Quest</h3>
              <p className="text-gray-600">
                Jump into fun coding missions designed just for your age. Learn by building real projects!
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg">
                3
              </div>
              <h3 className="text-xl mb-3 text-gray-900">Level Up!</h3>
              <p className="text-gray-600">
                Complete challenges, earn badges, and unlock new abilities. Become a Python master!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-6xl">⭐</div>
          <div className="absolute top-20 right-20 text-5xl">🚀</div>
          <div className="absolute bottom-10 left-1/3 text-4xl">💡</div>
          <div className="absolute bottom-20 right-1/4 text-5xl">🎯</div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-5xl mb-2">10,000+</div>
              <div className="text-indigo-200">Happy Students</div>
            </div>
            <div>
              <div className="text-5xl mb-2">500+</div>
              <div className="text-indigo-200">Fun Missions</div>
            </div>
            <div>
              <div className="text-5xl mb-2">50+</div>
              <div className="text-indigo-200">Cool Badges</div>
            </div>
            <div>
              <div className="text-5xl mb-2">100%</div>
              <div className="text-indigo-200">Free & Safe</div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section id="safe" className="py-20 bg-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-4">
                <Heart className="w-4 h-4" />
                <span>Parent & Teacher Approved</span>
              </div>
              <h2 className="text-4xl mb-4 text-gray-900">Safe, Private, and Educational</h2>
              <p className="text-xl text-gray-600">
                We take child safety seriously. PyBlocks is designed with privacy and security first.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border-2 border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg mb-2">No Personal Info Required</h3>
                    <p className="text-gray-600">Kids use nicknames and avatars - no real names or photos needed.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border-2 border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg mb-2">Ad-Free Experience</h3>
                    <p className="text-gray-600">100% free with no ads or hidden costs. Just pure learning fun.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border-2 border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg mb-2">Age-Appropriate Content</h3>
                    <p className="text-gray-600">All lessons designed specifically for kids aged 8-15.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border-2 border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg mb-2">Parent Dashboard</h3>
                    <p className="text-gray-600">Track progress and see what your child is learning.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-12 text-center border-2 border-indigo-200">
            <div className="text-6xl mb-6">🚀✨🎮</div>
            <h2 className="text-4xl mb-4 text-gray-900">Ready to Start Your Coding Adventure?</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of kids learning Python the fun way. Pick your avatar and start building today!
            </p>
            <Link href="/register">
              <Button 
                size="lg" 
                className="bg-indigo-600 hover:bg-indigo-700 h-16 px-10 text-xl rounded-xl shadow-lg"
              >
                <Rocket className="w-6 h-6 mr-2" />
                Create Your Free Account
              </Button>
            </Link>
            <p className="text-sm text-gray-500 mt-4">No credit card needed • Safe & secure • 100% free</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Code2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl text-white">PyBlocks</span>
              </div>
              <p className="text-gray-400">
                Making Python fun and accessible for kids everywhere!
              </p>
            </div>
            
            <div>
              <h4 className="text-white mb-4">Learn</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Courses</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Challenges</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white mb-4">Parents</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Safety Info</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Parent Guide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQs</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 PyBlocks. Made with ❤️ for young coders.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
